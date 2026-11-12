import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import {generalRows, displayDate, columns, stages, calibrationRemark, timeText, requester, location, isCapsText, activityDetailsText} from './model';

const navy = [0, 32, 96];
const blue = [65, 110, 188];

async function imageData(url) {
  const res = await fetch(url);
  if (!res.ok) throw Error('Could not load report branding.');
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => resolve(rd.result);
    rd.onerror = reject;
    res.blob().then(b => rd.readAsDataURL(b), reject);
  });
}

const clean = value => String(value ?? '').replace(/\r\n/g,'\n');

export async function generatePDF(r) {
  const [logo, regular, bold] = await Promise.all([
    imageData('/aes-logo.jpg'),
    imageData('/fonts/NotoSans-Regular.ttf'),
    imageData('/fonts/NotoSans-Bold.ttf')
  ]);
  const pdf = new jsPDF({unit: 'pt', format: 'letter', compress: true});
  pdf.addFileToVFS('NotoSans-Regular.ttf', regular.split(',')[1]);
  pdf.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  pdf.addFileToVFS('NotoSans-Bold.ttf', bold.split(',')[1]);
  pdf.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
  pdf.setProperties({
    title: `Inspection Report - ${r.reportNo}`,
    author: 'Akshar Engineering Services Pvt. Ltd.',
    subject: r.project
  });

  const left=36,width=540,bottom=738;
  pdf.setFont('NotoSans','normal');pdf.setFontSize(11);
  const headerLines=pdf.splitTextToSize(clean(r.reportNo),282);
  const headerOffset=Math.max(0,headerLines.length-1)*14;
  const top=140+headerOffset;
  let y = top;
  const drawnHeaders = new Set();

  const header = () => {
    const pageNumber = pdf.internal.getCurrentPageInfo().pageNumber;
    if (drawnHeaders.has(pageNumber)) return;
    drawnHeaders.add(pageNumber);
    pdf.setTextColor(...navy);
    pdf.setFont('NotoSans', 'bold');
    pdf.setFontSize(19);
    pdf.text('INSPECTION REPORT', 180, 43, {align: 'center'});
    pdf.setDrawColor(...blue);
    pdf.setLineWidth(1.2);
    pdf.line(36, 50, 325, 50);
    pdf.setFontSize(12);
    pdf.text('Inspection Visit Report No.:', 38, 65);
    pdf.setFont('NotoSans', 'normal');
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(clean(r.reportNo), 282);
    pdf.text(lines, 38, 80);
    pdf.line(36,86+headerOffset,325,86+headerOffset);
    const offset=headerOffset;
    pdf.setFont('NotoSans', 'bold');
    pdf.text('Revision:', 38, 100 + offset);
    pdf.setFont('NotoSans', 'normal');
    pdf.text(clean(r.revision), 91, 100 + offset);
    pdf.line(36, 106 + offset, 325, 106 + offset);
    pdf.setFont('NotoSans', 'bold');
    pdf.text('Date:', 38, 120 + offset);
    pdf.setFont('NotoSans', 'normal');
    pdf.text(displayDate(r.reportDate), 70, 120 + offset);
    pdf.addImage(logo, 'JPEG', 335, 30, 237, 78);
    pdf.setDrawColor(41, 68, 124);
    pdf.setLineWidth(3.5);
    pdf.line(277, 130 + offset, 576, 130 + offset);
    pdf.setTextColor(0);
    pdf.setFontSize(10);
  };

  header();
  const page = () => { pdf.addPage(); header(); y = top; };
  const room = h => { if (y + h > bottom) page(); };

  const paragraph = (value, {bold = false, size = 10} = {}) => {
    pdf.setFont('NotoSans', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(clean(value) || ' ', width);
    for (const line of lines) {
      room(size * 1.25);
      pdf.text(line, left, y + size);
      y += size * 1.25;
    }
    y += 5;
  };

  const heading = value => {
    room(48);
    y += 8;
    pdf.setTextColor(...blue);
    paragraph(value, {bold: true, size: 11});
    pdf.setTextColor(0);
  };

  const formatCellVal = v => {
    if (typeof v === 'object' && v !== null) return v;
    const s = clean(v);
    if (isCapsText(s)) {
      return {content: s, styles: {fontStyle: 'bold'}};
    }
    return s;
  };

  const table = (head, body, opts = {}) => {
    autoTable(pdf, {
      startY: y,
      head: head ? [head.map(clean)] : [],
      body: body.map(row => row.map(formatCellVal)),
      margin: {left, right: 36, top, bottom: 54},
      theme: 'grid',
      styles: {
        font: 'NotoSans',
        fontSize: 9.2,
        textColor: 0,
        lineColor: [75, 75, 75],
        lineWidth: 0.5,
        cellPadding: 3.5,
        overflow: 'linebreak',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: 0,
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [75, 75, 75],
        lineWidth: 0.5
      },
      rowPageBreak: 'avoid',
      didDrawPage: () => {
        if (pdf.internal.getCurrentPageInfo().pageNumber > 1) header();
      },
      ...opts
    });
    y = pdf.lastAutoTable.finalY + 5;
  };

  const richIntro = () => {
    let x = left;
    room(38);
    pdf.setFontSize(10);
    for (const [value, isBold] of [
      ['As requested by ', false],
      [requester(r), true],
      [' inspection carried out at ', false],
      [location(r), true],
      [' On ', false],
      [displayDate(r.inspectionDate), true],
      [' and scope of services as described below.', false]
    ]) {
      pdf.setFont('NotoSans', isBold ? 'bold' : 'normal');
      for (const word of clean(value).split(/(?<=\s)/)) {
        const w = pdf.getTextWidth(word);
        if (x + w > left + width && x > left) {
          y += 13;
          x = left;
          room(13);
        }
        pdf.text(word, x, y + 10);
        x += w;
      }
    }
    y += 18;
  };

  // General Info Table
  table(null, generalRows(r), {columnStyles: {0: {fontStyle: 'bold', cellWidth: 155}}});
  richIntro();

  // 1.0 Stage of Inspection
  heading('1.0 Stage of Inspection:');
  room(26);
  pdf.setFont('NotoSans', 'normal');
  stages.forEach((s, i) => {
    const x = left + i * 135;
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.6);
    pdf.rect(x, y + 2, 9, 9);
    if (r.stages.includes(s)) {
      pdf.line(x, y + 2, x + 9, y + 11);
      pdf.line(x + 9, y + 2, x, y + 11);
    }
    pdf.setFontSize(9);
    pdf.text(s, x + 13, y + 10);
  });
  y += 20;

  // 2.0 Name of Equipment / Inspected Item
  heading('2.0 Name of Equipment / Inspected Item:');
  table(
    ['PO. Sr. No. / Item No.', 'Item Description', 'P.O. Qty. (UOM)', 'Offered Qty. (UOM)', 'Inspected Qty. (UOM)'],
    r.equipment.map(x => columns.equipment.map(([k]) => x[k])),
    {columnStyles: {0: {cellWidth: 55, halign: 'center'}, 1: {cellWidth: 270}, 2: {halign: 'center'}, 3: {halign: 'center'}, 4: {halign: 'center'}}}
  );

  // 3.0 Reference Documents (unified table with Reference Standards top row)
  heading('3.0 Reference Documents:');
  table(
    null,
    [
      [{content: clean(`Reference Standards:${r.standards ? ` ${r.standards}` : ''}`), colSpan: 5, styles: {fontStyle: 'bold', halign: 'left'}}],
      ['Document Description', 'Document Number', 'Rev.', 'Date', 'Approval Status'].map(h => ({content: h, styles: {fontStyle: 'bold', halign: 'center'}})),
      ...r.documents.map(x => columns.documents.map(([k, , f], idx) => ({
        content: clean(f === 'date' ? displayDate(x[k]) : x[k]),
        styles: {halign: 'center', fontStyle: isCapsText(x[k]) ? 'bold' : 'normal'}
      })))
    ]
  );

  // 4.0 Inspection Activities as per ITP/QAP/MQP
  heading('4.0 Inspection Activities as per ITP/QAP/MQP:');
  const activities = [];
  if (r.activityGroup || r.activityGroupCode) {
    activities.push([
      {content: clean(r.activityGroupCode), styles: {fontStyle: 'bold', halign: 'center'}},
      {content: clean(r.activityGroup), colSpan: 3, styles: {fontStyle: 'bold'}}
    ]);
  }
  if (r.activitySubgroup || r.activitySubgroupCode) {
    activities.push([
      {content: clean(r.activitySubgroupCode), styles: {fontStyle: 'bold', halign: 'center'}},
      {content: clean(r.activitySubgroup), colSpan: 3, styles: {fontStyle: 'bold'}}
    ]);
  }
  activities.push(...r.activities.map(x => [
    {content: clean(x.clause), styles: {halign: 'center', fontStyle: isCapsText(x.clause) ? 'bold' : 'normal'}},
    {content: clean(x.description), styles: {fontStyle: isCapsText(x.description) ? 'bold' : 'normal'}},
    {content: clean(x.quantum), styles: {halign: 'center'}},
    {content: clean(x.scope), styles: {halign: 'center', fontStyle: isCapsText(x.scope) ? 'bold' : 'normal'}}
  ]));
  table(
    ['ITP/QAP Clause No.', 'Activity Description', 'Quantum of Check', 'Scope of Inspection (R/W/RW/V/H)'],
    activities,
    {columnStyles: {0: {cellWidth: 68}, 1: {cellWidth: 282}}}
  );

  // Flow text a line at a time. Each page closes its own border before a
  // continuation begins, so long QAP text cannot cross the footer or header.
  function wrapSpans(spans,firstIndent=8,continuationIndent=8,size=9.5){
    const lines=[];let pieces=[],used=0,indent=firstIndent;
    const commit=()=>{lines.push({pieces,indent});pieces=[];used=0;indent=continuationIndent;};
    for(const span of spans){
      pdf.setFont('NotoSans',span.bold?'bold':'normal');pdf.setFontSize(size);
      for(const token of clean(span.text).split(/(\s+)/).filter(Boolean)){
        let text=token;
        if(!used&&/^\s+$/.test(text))continue;
        if(used+pdf.getTextWidth(text)>width-indent-8&&used){commit();if(/^\s+$/.test(text))continue;}
        for(const char of text){const charWidth=pdf.getTextWidth(char);if(used+charWidth>width-indent-8&&used)commit();const last=pieces.at(-1);if(last&&last.bold===Boolean(span.bold)&&last.underline===Boolean(span.underline))last.text+=char;else pieces.push({text:char,bold:Boolean(span.bold),underline:Boolean(span.underline)});used+=charWidth;}
      }
    }
    if(pieces.length||!lines.length)commit();return lines;
  }
  function boxedBlocks(blocks,size=9.5){
    room(35);let boxTop=y;y+=5;
    const close=()=>{pdf.setDrawColor(75,75,75);pdf.setLineWidth(.5);pdf.rect(left,boxTop,width,Math.max(12,y-boxTop+4));};
    const nextLine=height=>{if(y+height>bottom-5){close();page();boxTop=y;y+=5;}};
    for(const block of blocks){
      if(block.space){nextLine(block.space);y+=block.space;continue;}
      const lines=wrapSpans(block.spans,block.firstIndent??8,block.indent??8,size);
      for(const [i,line] of lines.entries()){
        nextLine(13);let x=left+line.indent;
        if(block.bullet&&i===0){pdf.setFillColor(0);pdf.triangle(left+12,y+3,left+18,y+6,left+12,y+9,'F');}
        for(const piece of line.pieces){pdf.setTextColor(0);pdf.setFont('NotoSans',piece.bold?'bold':'normal');pdf.setFontSize(size);pdf.text(piece.text,x,y+10);const w=pdf.getTextWidth(piece.text);if(piece.underline){pdf.setDrawColor(0);pdf.setLineWidth(.4);pdf.line(x,y+12,x+w,y+12);}x+=w;}
        y+=13;
      }
      y+=block.after??2;
    }
    close();y+=10;
  }
  heading('5.0 Details of activities carried out:');
  const activityBlocks=activityDetailsText(r).split('\n').map(line=>{
    if(!line.trim())return {space:6};
    if(/^[➢•]/.test(line))return {bullet:true,firstIndent:25,indent:25,spans:[{text:line.replace(/^[➢•]\s*/,''),bold:false}]};
    if(/^Core Coil Assembly$/i.test(line.trim()))return {spans:[{text:line,bold:true,underline:true}]};
    const qap=line.match(/^(As per QAP[^:]*:)(.*)$/i);
    return qap?{firstIndent:8,indent:104,spans:[{text:qap[1],bold:true},{text:qap[2]}]}:{spans:[{text:line,bold:isCapsText(line)}]};
  });
  boxedBlocks(activityBlocks);

  // 6.0 Calibration Details (with Remark as the final bold row inside the table)
  heading('6.0 Calibration Details:');
  table(
    ['Details of Instrument', 'Make / Model / ID No. / Sr. No.', 'Calibration date', 'Calibration due date', 'Traceability to NABL/NPL'],
    [
      ...r.calibration.map(x => columns.calibration.map(([k, , f]) => ({
        content: clean(f === 'date' ? displayDate(x[k]) : x[k]),
        styles: {halign: 'center', fontStyle: isCapsText(x[k]) ? 'bold' : 'normal'}
      }))),
      [{content: clean(calibrationRemark), colSpan: 5, styles: {fontStyle: 'bold', halign: 'left', fontSize: 8.8}}]
    ]
  );

  for(const [label,value,inline] of [
    ['Conclusion:',r.conclusion,false],['Pending Activities:',r.pending,true],
    ['Identification of the Inspected Items:',r.identification,true],
    ['Non-Conformities raised / Discrepancies observed during Inspection:',r.nonconformities,true]
  ]){
    y+=4;
    const lines=clean(value).split('\n');
    const blocks=inline?[{spans:[{text:label+' ',bold:true},{text:lines.shift()||'',bold:isCapsText(value)}]}]:[{spans:[{text:label,bold:true}]}];
    for(const text of lines)blocks.push({spans:[{text,bold:isCapsText(text)}]});
    boxedBlocks(blocks);
  }
  boxedBlocks([{spans:[{text:'Enclosure:',bold:true}]},...clean(r.enclosures).split('\n').filter(Boolean).map(text=>({bullet:true,firstIndent:25,indent:25,spans:[{text:text.replace(/^[•➢-]\s*/,''),bold:isCapsText(text)}]}))]);

  // 7.0 Inspection Photographs (2-column bordered table grid)
  heading('7.0 Inspection Photographs:');
  if (!r.photos.length) {
    paragraph('No photographs attached.');
  }
  for(let i=0;i<r.photos.length;i+=2){
    const pair=[r.photos[i],r.photos[i+1]];pdf.setFont('NotoSans','bold');pdf.setFontSize(9.5);
    const captions=pair.map(p=>p?pdf.splitTextToSize(clean(p.caption),252):[]);
    const imageHeight=190,lines=Math.max(1,...captions.map(c=>c.length));
    room(imageHeight+Math.min(lines*13+10,100));const imageY=y;
    for(let j=0;j<2;j++){
      const x=left+j*270;pdf.setDrawColor(75,75,75);pdf.setLineWidth(.5);pdf.rect(x,imageY,270,imageHeight);
      if(pair[j]){const props=pdf.getImageProperties(pair[j].data);const scale=Math.min(254/props.width,182/props.height);pdf.addImage(pair[j].data,props.fileType,x+(270-props.width*scale)/2,imageY+(imageHeight-props.height*scale)/2,props.width*scale,props.height*scale);}
    }
    y+=imageHeight;let captionTop=y;y+=3;
    const closeCaption=()=>{pdf.setDrawColor(75,75,75);pdf.setLineWidth(.5);for(let j=0;j<2;j++)pdf.rect(left+j*270,captionTop,270,y-captionTop+3);};
    for(let k=0;k<lines;k++){
      if(y+13>bottom-4){closeCaption();page();captionTop=y;y+=3;}
      pdf.setFont('NotoSans','bold');pdf.setFontSize(9.5);pdf.setTextColor(0);
      captions.forEach((c,j)=>{if(c[k])pdf.text(c[k],left+j*270+135,y+10,{align:'center'});});y+=13;
    }
    closeCaption();y+=3;
  }
  y+=6;

  // 8.0 Expenditure Report
  heading('8.0 Expenditure Report:');
  table(
    ['Sr. No.', 'Date', 'Entry Time', 'Exit Time', 'Traveling Time', 'Total KM (RT)'],
    r.expenses.map((x, i) => [
      i + 1,
      displayDate(x.date),
      timeText(x.entry),
      timeText(x.exit),
      x.travel,
      x.km ? `${x.km} KM` : ''
    ]),
    {columnStyles: {0: {halign: 'center'}, 1: {halign: 'center'}, 2: {halign: 'center'}, 3: {halign: 'center'}, 4: {halign: 'center'}, 5: {halign: 'center'}}}
  );

  // Adaptive cells retain full names, even when they need multiple lines.
  room(125);y+=6;
  const signatureHeight=68;
  table(null,[
    [{content:'Inspected By:',colSpan:4,styles:{fontStyle:'bold',halign:'center'}},{content:'Reviewed By:',colSpan:4,styles:{fontStyle:'bold',halign:'center'}}],
    [{content:'',colSpan:4,styles:{minCellHeight:signatureHeight}},{content:'',colSpan:4,styles:{minCellHeight:signatureHeight}}],
    ['Name:',r.inspector,'Date:',displayDate(r.inspectorDate),'Name:',r.reviewer,'Date:',displayDate(r.reviewerDate)]
  ],{
    columnStyles:{0:{cellWidth:42,fontStyle:'bold'},1:{cellWidth:128},2:{cellWidth:36,fontStyle:'bold'},3:{cellWidth:64},4:{cellWidth:42,fontStyle:'bold'},5:{cellWidth:128},6:{cellWidth:36,fontStyle:'bold'},7:{cellWidth:64}},
    didDrawCell:data=>{if(data.row.index!==1||data.section!=='body')return;const signature=data.column.index===0?r.inspectorSignature:data.column.index===4?r.reviewerSignature:'';if(signature){const props=pdf.getImageProperties(signature);const scale=Math.min(170/props.width,55/props.height);pdf.addImage(signature,props.fileType,data.cell.x+(data.cell.width-props.width*scale)/2,data.cell.y+(data.cell.height-props.height*scale)/2,props.width*scale,props.height*scale);}}
  });
  room(28);y+=12;pdf.setFont('NotoSans','bold');pdf.setFontSize(10);pdf.text('--- End of Report ---',306,y+6,{align:'center'});

  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8.5);
    pdf.setFont('NotoSans', 'normal');
    pdf.setTextColor(...navy);
    pdf.text(`Page ${i} of ${total}`, 42, 756);
    pdf.text('Doc. No: AESPL/IR/01 Rev.00;', 570, 756, {align: 'right'});
    pdf.text('Effective Date: 01.04.2026', 570, 768, {align: 'right'});
  }
  return pdf.output('blob');
}
