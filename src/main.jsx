import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {containTab,restoreFocus,lockPageScroll} from './focus';
import {
  FileText, Plus, ArrowUpRight, ArrowRight, ArrowLeft, ChevronRight, Check,
  CheckCircle2, Clock3, Search, Download, Upload, ImagePlus, Images, Trash2,
  Copy, FolderOpen, LayoutDashboard, ClipboardCheck, Settings2, ShieldCheck,
  Link2, Users, FileCheck2, X, Menu, Eye, Loader2, AlertCircle, MoveUp,
  MoveDown, HardDrive, SlidersHorizontal, Pencil, RotateCcw
} from 'lucide-react';
import {
  newReport, blankRow, sections, stages, columns, narrative, location,
  locationOrganization, requester, displayDate, endDateDisplay, accreditationType,
  parseDateToIso, isCapsText, defaultActivityDetails, defaultConclusion,
  defaultPending, defaultIdentification, defaultNonconformities, defaultEnclosures,
  po, issues, stepDone, validateImport, calibrationRemark, uid, filterReports,
  hydrateReport, searchReportFields, sectionForField, activityDetailsText, fieldCatalog, searchableFields
} from './model';
import {readReports, saveReports, backup, download, imageFile} from './storage';
import {DateInput, ReportTextarea, ReportDetailRow} from './form-controls';
import './styles.css';
import './accessibility.css';
import './workspace.css';

const icons = [FileText, Settings2, ClipboardCheck, FileCheck2, Images, Users, Eye];



function SidebarToggleSvg({collapsed}) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      {collapsed ? <polyline points="13 9 16 12 13 15" /> : <polyline points="15 9 12 12 15 15" />}
    </svg>
  );
}


function Button({children, icon: Icon, className = '', ...props}) {
  return (
    <button type="button" className={`button ${className}`} {...props}>
      {Icon && <Icon size={17} />}
      <span>{children}</span>
    </button>
  );
}

function Field({
  label, ariaLabel, value, onChange, type = 'text', placeholder = '',
  hint, wide = false, required = false, disabled = false, rows = 3,
  min, alwaysBold = false, path, ...props
}) {
  const id = React.useId();
  const effectiveAria = ariaLabel || label;
  const boldActive = alwaysBold || isCapsText(value);
  return (
    <div className={`field ${wide ? 'wide' : ''}`} data-field-path={path}>
      <div className="field-label-row">
        <label htmlFor={id}>
          {label}
          {required && <span className="required" aria-hidden="true"> *</span>}
        </label>

      </div>
      {type === 'textarea' ? (
        <ReportTextarea id={id} aria-label={effectiveAria} aria-required={required}
          value={value??''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          rows={rows} disabled={disabled} alwaysBold={alwaysBold} {...props}/>

      ) : type === 'date' ? (
        <DateInput
          id={id}
          ariaLabel={effectiveAria}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder || 'DD.MM.YYYY (type or pick)'}
          required={required}
          disabled={disabled}
        />
      ) : (
        <input
          id={id}
          aria-label={effectiveAria}
          aria-required={required}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          type={type}
          placeholder={placeholder}
          min={min}
          disabled={disabled}
          className={boldActive ? 'caps-bold' : ''}
          {...props}
        />
      )}
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Card({title, subtitle, number, action, children, className = ''}) {
  return (
    <section className={`card ${className}`}>
      <div className="card-heading">
        <div className="card-title">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="card-content">{children}</div>
    </section>
  );
}

function EditableTable({type, rows, onChange, title = 'Add row'}) {
  const [pendingRemoval,setPendingRemoval] = useState(null);
  const defs = columns[type];
  const entryName={equipment:'Equipment item',documents:'Reference document',activities:'Inspection activity',calibration:'Instrument',expenses:'Visit entry',persons:'Person'}[type];
  const edit = (id, key, value) => onChange(rows.map(x => x.id === id ? {...x, [key]: value} : x));
  return (
    <div className={`entry-list ${type}-entries`}>
            {rows.map((row, index) => (
              <fieldset className="entry-card" key={row.id}>
                <legend>{entryName} {String(index + 1).padStart(2, '0')}</legend>
                <div className="entry-fields">
                {defs.map(([key, label, format, placeholder]) => {
                  const val = row[key] ?? '';
                  const cellBold = isCapsText(val);
                  const id=`entry-${row.id}-${key}`;
                  return (
                    <div className={`field ${key==='description'||key==='instrument'?'wide':''}`} key={key} data-field-path={`${type}.${row.id}.${key}`}>
                      <label htmlFor={id}>{label}</label>
                      {format === 'scope' ? (
                        <select
                          id={id}
                          aria-label={`${label} row ${index + 1}`}
                          value={val}
                          className={cellBold ? 'caps-bold' : ''}
                          onChange={e => edit(row.id, key, e.target.value)}
                        >
                          <option value="">Select scope</option>
                          {['R', 'W', 'RW', 'V', 'H'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : format === 'textarea' || key === 'description' ? (
                        <ReportTextarea id={id} aria-label={`${label} row ${index+1}`} value={val}
                          rows={type==='equipment'?3:2} placeholder={placeholder||'Enter description'}
                          onChange={e=>edit(row.id,key,e.target.value)}/>
                      ) : format === 'date' ? (
                        <DateInput
                          id={id}
                          ariaLabel={`${label} row ${index + 1}`}
                          value={val}
                          placeholder={placeholder || 'DD.MM.YYYY'}
                          onChange={v => edit(row.id, key, v)}
                        />
                      ) : (
                        <input
                          id={id}
                          aria-label={`${label} row ${index + 1}`}
                          type={format || 'text'}
                          min={format === 'number' ? '0' : undefined}
                          value={val}
                          placeholder={placeholder || 'Enter value'}
                          className={cellBold ? 'caps-bold' : ''}
                          onChange={e => edit(row.id, key, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
                </div>
                <div className="entry-actions">
                  <button
                    type="button" className="button remove-row danger-text"
                    aria-label={`Remove ${entryName.toLowerCase()} ${index + 1}`}
                    title="Remove row"
                    disabled={rows.length === 1}
                    onClick={() => Object.entries(row).some(([k,v])=>k!=='id'&&String(v).trim()) ? setPendingRemoval(row.id) : onChange(rows.filter(x=>x.id!==row.id))}
                  >
                    <Trash2 size={18} /><span>Remove {entryName.toLowerCase()}</span>
                  </button>
                </div>
              </fieldset>
            ))}
      <button type="button" className="add-row" onClick={() => onChange([...rows, blankRow(type)])}>
        <Plus size={16} />
        {title}
      </button>
      {pendingRemoval&&<Modal title="Remove this row?" onClose={()=>setPendingRemoval(null)}>
        <p className="modal-copy">The values in this row will be removed from this report. The other rows will stay in place.</p>
        <div className="modal-actions"><Button onClick={()=>setPendingRemoval(null)}>Keep row</Button><Button className="danger-button" onClick={()=>{onChange(rows.filter(x=>x.id!==pendingRemoval));setPendingRemoval(null);}}>Remove row</Button></div>
      </Modal>}
    </div>
  );
}

function FormattedActivityPreview({text}) {
  const lines = String(text || '').split('\n');
  return (
    <div className="report-box-preview" role="region" aria-label="Section 5.0 formatted report preview">
      <div className="preview-box-header">
        <span>Original report text</span>
      </div>
      <div className="preview-box-body">
        {lines.map((raw, idx) => {
          const line = raw.trim();
          if (!line) return <div key={idx} className="preview-spacer" />;
          if (line.startsWith('➢') || line.startsWith('•')) {
            return (
              <div key={idx} className="preview-bullet">
                <span className="bullet-mark">➢</span>
                <span>{line.replace(/^[➢•]\s*/, '')}</span>
              </div>
            );
          }
          if (/^Core Coil Assembly$/i.test(line)) {
            return <div key={idx} className="preview-underlined-heading">{line}</div>;
          }
          const qapMatch = line.match(/^(As per QAP[^:]*:)(.*)$/i);
          if (qapMatch) {
            return (
              <div key={idx} className="preview-qap-line">
                <strong>{qapMatch[1]}</strong>
                <span>{qapMatch[2]}</span>
              </div>
            );
          }
          return (
            <div key={idx} className={`preview-regular-line ${isCapsText(line) ? 'caps-bold' : ''}`}>
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Modal({title,children,onClose}) {
  const ref=useRef(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement,root=document.getElementById('root');
    const rootWasInert=root.inert,unlockScroll=lockPageScroll();
    root.inert=true;ref.current.focus();
    const handler=event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close.current();}
      else containTab(event,ref.current);
    };
    ref.current.addEventListener('keydown',handler);
    return()=>{ref.current?.removeEventListener('keydown',handler);root.inert=rootWasInert;unlockScroll();restoreFocus(previous);};
  },[]);
  return createPortal(<div className="modal-backdrop" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div role="dialog" aria-modal="true" aria-label={title} className="modal" tabIndex={-1} ref={ref}>
      <div className="modal-heading"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></div>
      {children}
    </div>
  </div>,document.body);
}

function App() {
  const [reports, setReports] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [step, setStep] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [formSearch, setFormSearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(()=>{try{return localStorage.getItem('aes-sidebar-collapsed')==='true';}catch{return false;}});
  const [sectionWarnings,setSectionWarnings] = useState([]);
  const [dirty, setDirty] = useState(false);
  const snapshotRef = useRef(null);

  const [search, setSearch] = useState('');
  const [searchBy,setSearchBy]=useState('all');
  const [accreditationFilter,setAccreditationFilter]=useState('');
  const [dateFrom,setDateFrom]=useState('');
  const [dateTo,setDateTo]=useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [filter, setFilter] = useState('all');

  const [saveState, setSaveState] = useState('saved');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');
  const [mobile, setMobile] = useState(false);
  const [smallScreen,setSmallScreen]=useState(()=>matchMedia('(max-width:820px)').matches);
  const sidebarRef=useRef(null),mobileMenuRef=useRef(null);
  const sidebarHidden=smallScreen&&!mobile;
  useEffect(()=>{const query=matchMedia('(max-width:820px)');const change=()=>{setSmallScreen(query.matches);if(!query.matches)setMobile(false);};query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  useEffect(()=>{
    if(!mobile||!smallScreen)return;
    const sidebar=sidebarRef.current,unlockScroll=lockPageScroll();
    sidebar.querySelector('.mobile-close').focus();
    const handler=event=>{if(event.key==='Escape'){event.preventDefault();setMobile(false);}else containTab(event,sidebar);};
    sidebar.addEventListener('keydown',handler);
    return()=>{sidebar.removeEventListener('keydown',handler);unlockScroll();restoreFocus(mobileMenuRef.current);};
  },[mobile,smallScreen]);
  const [modal, setModal] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');

  const importRef = useRef();
  const fileRef = useRef();
  const saveTimer = useRef();
  const latest = useRef(reports);
  const toastTimer = useRef();
  latest.current = reports;

  useEffect(() => {
    readReports()
      .then(data => { setReports(data.map(hydrateReport)); setLoaded(true); })
      .catch(() => { setError('Browser storage is unavailable. Enable browser storage and reload before creating a report.'); });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaveState('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveReports(reports)
        .then(() => { if (latest.current === reports) { setSaveState('saved'); setError(''); } })
        .catch(() => { setSaveState('error'); setError('This report could not be saved. Download a backup now to preserve your work, then free browser storage.'); });
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [reports, loaded]);

  useEffect(() => {
    const warn = e => {
      if (saveState !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  useEffect(()=>{try{localStorage.setItem('aes-sidebar-collapsed',String(sidebarCollapsed));}catch{}},[sidebarCollapsed]);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const r = reports.find(x => x.id === activeId);
  const alert = message => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  };

  const update = (key, value) => {
    setDirty(true); setSaveState('saving'); setSectionWarnings([]);
    const section=sectionForField(key);
    setReports(prev=>prev.map(x=>x.id===activeId?{...x,[key]:value,status:'draft',completedSteps:(x.completedSteps||[]).filter(i=>i!==section&&i!==6),updatedAt:new Date().toISOString()}:x));
  };
  const field=(key,label,props={})=><Field key={key} path={key} label={label} value={r[key]} onChange={v=>update(key,v)} {...props}/>;
  const navigate=n=>{setStep(n);setSectionWarnings([]);setMobile(false);window.scrollTo({top:0,behavior:'smooth'});};
  const goToField=result=>{
    setShowAllSteps(false);setFormSearch('');navigate(result.section);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const path=result.path==='requester'&&r.requesterIsClient?'client':result.path==='locationOrganization'&&r.locationIsManufacturer?'manufacturer':result.path;
      const box=document.querySelector(`[data-field-path="${CSS.escape(path)}"]`);
      if(box){box.scrollIntoView({behavior:'smooth',block:'center'});(box.querySelector('input:not([type=hidden]),textarea,select,button')||box).focus({preventScroll:true});box.classList.add('field-found');setTimeout(()=>box.classList.remove('field-found'),2500);}
    }));
  };
  const completeCurrentStep=()=>{
    const found=issues(r).filter(x=>showAllSteps?x.section<6:x.section===step);
    if(found.length){setSectionWarnings(found);setTimeout(()=>document.querySelector('.section-validation')?.scrollIntoView({behavior:'smooth',block:'center'}),30);return;}
    const completed=showAllSteps?[0,1,2,3,4,5]:[step];
    setReports(prev=>prev.map(x=>x.id===activeId?{...x,completedSteps:[...new Set([...(x.completedSteps||[]),...completed])],updatedAt:new Date().toISOString()}:x));
    setDirty(true);setShowAllSteps(false);setFormSearch('');navigate(showAllSteps?6:Math.min(step+1,6));
  };

  const open = report => {
    snapshotRef.current = structuredClone(report);
    setDirty(false);
    setSectionWarnings([]);
    setFormSearch('');
    setShowAllSteps(false);
    setActiveId(report.id);
    navigate(0);
  };

  const requestLeave = (onConfirmLeave) => {
    if (r && dirty) {
      setModal({type: 'leave-warning', onConfirmLeave});
      return;
    }
    onConfirmLeave();
  };

  const closeEditor = () => {
    requestLeave(() => {
      setDirty(false);
      setActiveId(null);
      setMobile(false);
    });
  };

  const add = () => {
    requestLeave(() => {
      const next = newReport();
      setReports(prev => [next, ...prev]);
      open(next);
    });
  };

  const manualSave = async () => {
    clearTimeout(saveTimer.current);
    setSaveState('saving');
    try {
      const savedSnapshot=latest.current;
      await saveReports(savedSnapshot);
      if(latest.current!==savedSnapshot){setSaveState('saving');return false;}
      if (r) snapshotRef.current = structuredClone(r);
      setDirty(false);
      setSaveState('saved');
      setError('');
      alert('All reports saved in this browser.');
      return true;
    } catch {
      setSaveState('error');
      setError('Could not save. Download a backup to preserve your reports.');
      return false;
    }
  };

  const duplicate = report => requestLeave(() => {
    const copy = structuredClone(report);
    copy.id = uid();
    copy.reportNo = report.reportNo ? `${report.reportNo}-COPY` : '';
    copy.status = 'draft';
    copy.completedSteps=[];
    copy.createdAt = copy.updatedAt = new Date().toISOString();
    setReports(prev => [copy, ...prev]);
    open(copy);
    alert('Report duplicated. Update the report number before exporting.');
  });

  const remove = id => {
    setReports(prev => prev.filter(x => x.id !== id));
    if (id === activeId) {
      setDirty(false);
      setActiveId(null);
    }
    setModal(null);
    alert('Report deleted from this browser.');
  };

  const restore = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 100 * 1024 * 1024) throw Error('Backup exceeds the 100 MB limit.');
      const incoming = validateImport(JSON.parse(await file.text()));
      setReports(prev => [...incoming, ...prev]);
      alert(`${incoming.length} report${incoming.length === 1 ? '' : 's'} restored as new drafts.`);
    } catch (err) {
      alert(err.message || 'Could not restore the backup.');
    }
  };

  const exportReport = async (type, draft = false, targetReport = r) => {
    const target = targetReport || r;
    if (!target) return;
    if (!draft && issues(target).length) {
      if (target.id === activeId) navigate(6);
      alert('Complete the listed fields, or choose a draft export.');
      return;
    }
    setBusy(type);
    try {
      const blob = type === 'word' ? await (await import('./word')).generateWord(target) : await (await import('./pdf')).generatePDF(target);
      const filename = (target.reportNo || 'AES-inspection-report').replace(/[^a-z0-9_.-]/gi, '-');
      download(blob, `${filename}${draft ? '-DRAFT' : ''}.${type === 'word' ? 'docx' : 'pdf'}`);
      alert(`${type === 'word' ? 'Word document' : 'PDF'} downloaded.`);
    } catch (e) {
      alert(e.message || 'Export failed. Your draft is still available.');
    } finally {
      setBusy('');
    }
  };

  const preview = async (targetReport = r) => {
    const target = targetReport || r;
    if (!target) return;
    setBusy('preview');
    try {
      const blob = await (await import('./pdf')).generatePDF(target);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
      setModal({type: 'preview'});
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy('');
    }
  };

  const uploadPhotos = async files => {
    setBusy('photos');
    try {
      const additions = [];
      for (const file of files) additions.push({id: uid(), name: file.name, data: await imageFile(file), caption: ''});
      setDirty(true);
      setReports(prev => prev.map(x => x.id === activeId ? {...x, photos: [...x.photos, ...additions], status: 'draft', completedSteps:(x.completedSteps||[]).filter(i=>i!==4&&i!==6), updatedAt: new Date().toISOString()} : x));
      alert(`${additions.length} photograph${additions.length === 1 ? '' : 's'} added. Write a caption for each.`);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy('');
    }
  };

  const signature = async (key, file) => {
    if (!file) return;
    try { update(key, await imageFile(file)); } catch (e) { alert(e.message); }
  };

  const reportIssues = r ? issues(r) : [];

  const filtered=filterReports(reports,{search,searchBy,stage:stageFilter,status:filter,accreditation:accreditationFilter,dateFrom,dateTo});
  const accreditationOptions=[...new Set(reports.map(accreditationType).filter(Boolean))].sort();
  const hasFilters=Boolean(search||searchBy!=='all'||stageFilter||filter!=='all'||accreditationFilter||dateFrom||dateTo);
  const resetFilters=()=>{setSearch('');setSearchBy('all');setStageFilter('');setFilter('all');setAccreditationFilter('');setDateFrom('');setDateTo('');};
  const activeSearchQuery = formSearch.trim();
  const searchResults = r && activeSearchQuery ? searchReportFields(r,activeSearchQuery) : [];
  const isStepVisible=idx=>showAllSteps||step===idx;

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}><a className="skip-link" href="#main-content">Skip to report content</a>
      <div ref={sidebarRef} id="report-sidebar" inert={sidebarHidden?true:undefined} aria-hidden={sidebarHidden?true:undefined} role={mobile&&smallScreen?'dialog':'complementary'} aria-modal={mobile&&smallScreen?true:undefined} aria-label={mobile&&smallScreen?'Report navigation':'Report sidebar'} className={`sidebar ${mobile ? 'mobile-open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top-row">
          <a className="brand" href="#" onClick={e => { e.preventDefault(); closeEditor(); }}>
            <img src="/aes-logo.jpg" alt="Akshar Engineering Services" />
            <span>INSPECTION WORKSPACE</span>
          </a>
          <button className="mobile-close icon-button" aria-label="Close navigation" onClick={() => setMobile(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <button className={`nav-item ${!r ? 'active' : ''}`} onClick={closeEditor}>
          <LayoutDashboard size={18} />
          <span>Inspection reports</span>
          <span className="nav-count">{reports.length}</span>
        </button>


        {r ? (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-label">CURRENT REPORT <span className="tiny-dot" /></div>
            <div className="sidebar-report">
              {r.reportNo || 'New inspection report'}
              <small>{r.client || 'Client details to be added'}</small>
            </div>
            <nav className="steps" aria-label="Report sections">
              {sections.map((title, i) => {
                const done = stepDone(r, i);
                return (
                  <button
                    key={title}
                    aria-current={step===i&&!showAllSteps?'step':undefined} className={`step ${step === i && !showAllSteps ? 'active' : ''} ${done ? 'done' : ''}`}
                    onClick={() => { setShowAllSteps(false); setFormSearch(''); navigate(i); }}
                  >
                    <span className="step-circle">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{title}</span>
                    {done && <Check className="section-reviewed" size={16} aria-label="Reviewed"/>}
                    {step === i && !done && <ChevronRight size={15} />}
                  </button>
                );
              })}
            </nav>
          </>
        ) : null}

        <div className="sidebar-bottom">
          <div className="local-indicator">
            <HardDrive size={17} />
            <div>Saved on this device<small>Back up reports to keep a copy.</small></div>
          </div>
          <button className="nav-item help-link" onClick={() => setModal({type: 'help'})}>
            <AlertCircle size={17} />
            <span>Help & storage</span>
            <ArrowUpRight size={14} />
          </button>

        </div>
      </div>
      {mobile && <div className="sidebar-overlay" onClick={() => setMobile(false)} />}

      <div className="main-shell" inert={mobile&&smallScreen?true:undefined}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              type="button"
              className="sidebar-toggle-button"
              aria-label={sidebarCollapsed ? 'Menu: expand sidebar' : 'Menu: collapse sidebar'}
              title={sidebarCollapsed ? 'Expand workspace sidebar' : 'Keep section navigation only'}
              aria-expanded={!sidebarCollapsed} aria-controls="report-sidebar"
              onClick={() => {
                if (window.innerWidth <= 820) setMobile(true);
                else setSidebarCollapsed(v => !v);
              }}
            >
              <SidebarToggleSvg collapsed={sidebarCollapsed} />
              <span>Menu</span>
            </button>
            <button ref={mobileMenuRef} className="mobile-menu icon-button" aria-label="Open navigation" aria-controls="report-sidebar" aria-expanded={mobile} onClick={() => setMobile(true)}>
              <Menu size={20} />
            </button>
            <button onClick={closeEditor}>Inspection reports</button>
            {r && (
              <>
                <ChevronRight size={15} />
                <strong>{r.reportNo ? 'Edit report' : 'New report'}</strong>
              </>
            )}
          </div>
          <div className="topbar-right">
            <span className="save-indicator">
              {saveState === 'saving' ? <Loader2 size={15} className="spin" /> : saveState === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
              <span>{!loaded ? 'Loading…' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Not saved' : 'Saved locally'}</span>
            </span>

          </div>
        </header>

        <main id="main-content" tabIndex={-1} className={r ? 'editor-page' : 'library-page'}>
          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button onClick={() => backup(reports)}>Download backup</button>
            </div>
          )}

          {!loaded ? (
            <div className="loading-state"><Loader2 className="spin" />Opening your workspace…</div>
          ) : !r ? (
            <>
              <div className="page-title">
                <div>
                  <div className="eyebrow">AKSHAR ENGINEERING SERVICES</div>
                  <h1>Inspection reports<span className="title-dot">.</span></h1>
                  <p>Create, edit and download inspection reports.</p>
                </div>
                <div className="report-tools">
                  <Button icon={Upload} onClick={() => importRef.current.click()}>Restore</Button>
                  <Button icon={Download} disabled={!reports.length} onClick={() => backup(reports)}>Backup</Button>
                  <Button className="primary" icon={Plus} onClick={add}>Create report</Button>
                </div>
              </div>

              <section className="reports-section">
                <div className="report-list-heading"><h2>Your reports</h2><span role="status">{filtered.length} of {reports.length} reports</span></div>
                <div className="portal-filter-bar" role="search" aria-label="Find inspection reports">
                  <div className="filter-control"><label htmlFor="search-by">Search by</label><select id="search-by" value={searchBy} onChange={e=>setSearchBy(e.target.value)}>{[['all','All report fields'],['reportNo','Report number'],['client','Client'],['project','Project'],['manufacturer','Manufacturer / supplier'],['location','Inspection location'],['inspector','Inspector name'],['equipment','Equipment description']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
                  <div className="filter-control report-search-control"><label htmlFor="report-search">Search reports</label><div className="report-search-input"><Search size={20}/><input id="report-search" type="search" aria-label="Search reports" placeholder={searchBy==='all'?'Search any report field…':'Type to filter reports…'} value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
                  <div className="filter-control"><label htmlFor="accreditation-filter">Accreditation type</label><select id="accreditation-filter" value={accreditationFilter} onChange={e=>setAccreditationFilter(e.target.value)}><option value="">All types</option>{accreditationOptions.map(value=><option key={value}>{value}</option>)}</select></div>
                  <div className="filter-control"><label htmlFor="stage-filter">Inspection stage</label><select id="stage-filter" value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option value="">All stages</option>{stages.map(value=><option key={value}>{value}</option>)}</select></div>
                  <div className="filter-control"><label htmlFor="draft-filter">Report status</label><select id="draft-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All reports</option><option value="draft">Draft</option><option value="ready">Ready</option></select></div>
                  <div className="filter-control"><label htmlFor="date-from">Inspection date from</label><input id="date-from" type="date" value={dateFrom} max={dateTo||undefined} onChange={e=>setDateFrom(e.target.value)}/></div>
                  <div className="filter-control"><label htmlFor="date-to">Inspection date to</label><input id="date-to" type="date" value={dateTo} min={dateFrom||undefined} onChange={e=>setDateTo(e.target.value)}/></div>
                  <Button icon={RotateCcw} className="reset-filters" disabled={!hasFilters} onClick={resetFilters}>Reset filters</Button>
                </div>

                {filtered.length ? (
                  <div className="report-list-scroll">
                    <table className="report-list portal-grid-table">
                      <thead><tr><th>Report / client</th><th>Project / manufacturer</th><th>Inspection date</th><th>Stage</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>{filtered.map(report=><tr key={report.id}>
                        <td data-label="Report / client"><button className="report-link" onClick={()=>open(report)}><span>{report.reportNo||'Untitled inspection report'}<small>{report.client||'Client not added'}</small></span></button></td>
                        <td data-label="Project / manufacturer"><span className="report-project">{report.project||'—'}</span><small className="report-supplier">{report.manufacturer}</small></td>
                        <td data-label="Inspection date">{displayDate(report.inspectionDate)||'—'}</td>
                        <td data-label="Stage">{report.stages.join(', ')||'Not selected'}</td>
                        <td data-label="Status"><span className={`status-badge ${report.status}`}>{report.status==='ready'?<CheckCircle2 size={15}/>:<Clock3 size={15}/>} {report.status==='ready'?'Ready':'Draft'}</span></td>
                        <td data-label="Actions"><div className="report-actions">
                          <Button icon={FileText} disabled={!!busy} onClick={()=>exportReport('word',report.status!=='ready',report)}>Word</Button>
                          <Button icon={Download} disabled={!!busy} onClick={()=>exportReport('pdf',report.status!=='ready',report)}>PDF</Button>
                          <Button className="primary" icon={Pencil} onClick={()=>open(report)}>Edit</Button>
                          <Button aria-label={`More actions for ${report.reportNo||'report'}`} onClick={()=>setModal({type:'report-actions',id:report.id})}>More</Button>
                        </div></td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon"><FolderOpen size={30} /></span>
                    <h3>{hasFilters ? 'No matching reports' : 'No inspection reports yet'}</h3>
                    <p>{hasFilters ? 'Try clearing or adjusting your search filters above.' : 'Create a report to begin your next inspection.'}</p>
                    {!hasFilters && (
                      <Button className="primary" icon={Plus} onClick={add}>Create your first report</Button>
                    )}
                  </div>
                )}
              </section>


            </>
          ) : (
            <>
              <div className="page-title editor-title">
                <div>
                  <button className="back-link" onClick={closeEditor}>
                    <ArrowLeft size={15} />All inspection reports
                  </button>
                  <h1>
                    {r.reportNo ? 'Edit inspection report' : 'New inspection report'}
                    <span className={`status-badge ${r.status}`}>{r.status === 'ready' ? 'Ready' : 'Draft'}</span>
                  </h1>
                  <p>{r.client || 'Fill in the report sections below and download as Word (.docx) or PDF at any time.'}</p>
                </div>
              </div>
                <div className="report-command-bar">
                  <Button icon={Download} disabled={!!busy} onClick={() => exportReport('word', issues(r).length > 0)}>
                    {busy === 'word' ? 'Preparing…' : 'Download Word'}
                  </Button>
                  <Button icon={Download} disabled={!!busy} onClick={() => exportReport('pdf', issues(r).length > 0)}>
                    {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
                  </Button>
                  <Button icon={Eye} disabled={!!busy} onClick={()=>preview(r)}>
                    {busy === 'preview' ? 'Preparing…' : 'Preview PDF'}
                  </Button>
                  <Button icon={saveState === 'saving' ? Loader2 : Check} className="primary" onClick={manualSave}>Save draft</Button>
                </div>

              {/* Form Search & View All Fields Bar */}
              <div className="form-utility-bar">
                <div className="form-search-box">
                  <Search size={17} />
                  <input
                    type="text"
                    aria-label="Search fields inside this form"
                    placeholder="Find a field or an entered value…"
                    value={formSearch}
                    onChange={e => setFormSearch(e.target.value)}
                  />
                  {formSearch && (
                    <button type="button" className="icon-button" aria-label="Clear form search" onClick={() => setFormSearch('')}>
                      <X size={15} />
                    </button>
                  )}
                </div>
                <div className="form-utility-actions">
                  <button
                    type="button"
                    className={`button ${showAllSteps ? 'primary' : ''}`}
                    onClick={() => {
                      setFormSearch('');
                      setShowAllSteps(v => !v);
                    }}
                  >
                    <SlidersHorizontal size={16} />
                    <span>{showAllSteps ? 'Step-by-step view' : 'View all sections'}</span>
                  </button>
                </div>
              </div>

              {activeSearchQuery&&<section className="field-search-results" aria-label="Field search results">
                <div className="search-result-heading"><h2>{searchResults.length} matching {searchResults.length===1?'field':'fields'}</h2><span>Searches field names, guidance and entered values across all seven steps.</span></div>
                {searchResults.length?<div className="search-result-list">{searchResults.slice(0,60).map(result=><button key={result.path} onClick={()=>goToField(result)}><span className="search-step">{result.section+1}</span><span><strong>{result.label}</strong><small>{result.value&& !result.path.endsWith('Signature') ? result.value.slice(0,160):result.help}</small></span><ArrowRight size={17}/></button>)}</div>:<p className="no-field-results">No fields match “{formSearch}”. Try a field name, a report section number, or text you entered.</p>}
              </section>}
              {sectionWarnings.length>0&&<div className="section-validation" role="alert"><h2>Complete these details before continuing</h2><ul>{sectionWarnings.map((x,i)=><li key={i}>{x.message}</li>)}</ul><p>You can also choose another step and return later.</p></div>}
              <div className="editor-layout">
                <div className="form-column">
                  {!showAllSteps && (
                    <div className="section-intro">
                      <span className="step-label">
                        STEP {String(step + 1).padStart(2, '0')} OF 07 · {stepDone(r, step) ? 'COMPLETED ✓' : 'IN PROGRESS'}
                      </span>
                      <h2>{sections[step]}</h2>
                      <p>
                        {[
                          'Enter the report header, inspection details and inspection stage in the order they appear in the report.',
                          'Describe the equipment, quantities and reference documents used for this inspection.',
                          'Record the QAP activities and review the original section 5.0 text.',
                          'Enter instrument calibration details, followed by the inspection findings.',
                          'Upload photographs and describe what each image shows. Photographs are optional.',
                          'Record the visit expenses, then the inspector and reviewer sign-off.',
                          'Review every section and download the report in Word or PDF.'
                        ][step]}
                      </p>
                    </div>
                  )}

                  {isStepVisible(0)&&<>
                    <Card title="Report header" subtitle="These details appear alongside the AES logo on every page.">
                      <div className="form-grid report-meta">
                        {field('reportNo','Inspection visit report no.',{required:true,wide:true,placeholder:'e.g. AESPL/IACL/BEPL/IR/AS/2611/0701'})}
                        {field('revision','Revision',{required:true,placeholder:'00'})}
                        {field('reportDate','Report date',{required:true,type:'date',hint:'Type a date or choose it from the calendar.'})}
                      </div>
                    </Card>
                    <Card title="Inspection details" subtitle="The ten rows below follow the details table in your report." className="report-details-card">
                      <ReportDetailRow number={1} title="Client name" help="The organization commissioning the inspection.">
                        {field('client','Client name',{required:true,placeholder:'e.g. M/s. Indo Asia Copper Limited.'})}
                      </ReportDetailRow>
                      <ReportDetailRow number={2} title="Project name" help="The plant, substation or project being inspected.">
                        {field('project','Project name',{required:true,placeholder:'e.g. 220/33/11kV Substation – Copper Plant'})}
                      </ReportDetailRow>
                      <ReportDetailRow number={3} title="PO · client to vendor" help="The purchase order issued by the client to the manufacturer.">
                        <div className="form-grid">{field('vendorPO','PO number · client to vendor',{placeholder:'e.g. PO/JFD/CP/ELE/10'})}{field('vendorPODate','PO date · client to vendor',{type:'date'})}</div>
                      </ReportDetailRow>
                      <ReportDetailRow number={4} title="Inspection notification" help="The inspection call, email or notification reference.">
                        <div className="form-grid">{field('notification','Inspection notification no.',{placeholder:'e.g. As per Email'})}{field('notificationDate','Notification date',{type:'date'})}</div>
                      </ReportDetailRow>
                      <ReportDetailRow number={5} title="Manufacturer / supplier" help="The organization manufacturing or supplying the equipment.">
                        {field('manufacturer','Manufacturer / supplier',{required:true,placeholder:'e.g. M/s. Bharat Bijlee Limited.'})}
                      </ReportDetailRow>
                      <ReportDetailRow number={6} title="PO · client to AES" help="The purchase order issued to Akshar Engineering Services.">
                        <div className="form-grid">{field('aesPO','PO number · client to AES',{placeholder:'e.g. 1014000087'})}{field('aesPODate','PO date · client to AES',{type:'date'})}</div>
                      </ReportDetailRow>
                      <ReportDetailRow number={7} title="Place of inspection" help="The factory or site where this visit takes place.">
                        <label className="inline-checkbox"><input data-field-path="locationIsManufacturer" type="checkbox" aria-label="Use the manufacturer / supplier name" checked={r.locationIsManufacturer} onChange={e=>update('locationIsManufacturer',e.target.checked)}/><span>Use the manufacturer / supplier name</span></label>
                        {!r.locationIsManufacturer&&field('locationOrganization','Inspection organization',{required:true,placeholder:'Organization or factory name'})}
                        <div className="form-grid location-fields">
                          {field('street','Street / address',{wide:true,placeholder:'Optional plot, building or road'})}
                          {field('area','Area / locality',{placeholder:'e.g. Airoli',hint:'Used in the opening paragraph.'})}
                          {field('city','City',{placeholder:'e.g. Navi Mumbai'})}
                          {field('state','State',{required:true,placeholder:'e.g. Maharashtra',hint:'The opening paragraph ends the location here.'})}
                          {field('postalCode','PIN code',{placeholder:'e.g. 400708',inputMode:'numeric',maxLength:6})}
                        </div>
                        {location(r,true)&&<div className="address-preview"><span>Full inspection address</span><p>{location(r,true)}</p></div>}
                      </ReportDetailRow>
                      <ReportDetailRow number={8} title="Inspection requested by" help="The organization that requested this visit.">
                        <label className="inline-checkbox"><input data-field-path="requesterIsClient" type="checkbox" aria-label="Same as the client" checked={r.requesterIsClient} onChange={e=>update('requesterIsClient',e.target.checked)}/><span>Same as the client</span></label>
                        {r.requesterIsClient?<div className="linked-value"><Link2 size={16}/><span>{r.client||'Enter the client name in row 01.'}</span></div>:field('requester','Inspection requested by',{required:true,placeholder:'Requesting organization'})}
                      </ReportDetailRow>
                      <ReportDetailRow number={9} title="Date of inspection" help="The visit start date and number of inspection days.">
                        <div className="form-grid">{field('inspectionDate','Date of inspection',{type:'date',required:true})}{field('duration','Duration (days)',{type:'number',min:1,hint:'For a one-day visit, enter 1.'})}</div>
                      </ReportDetailRow>
                      <ReportDetailRow number={10} title="People present" help="One row per attendee. “On behalf of” is the organization they represent.">
                        <EditableTable type="persons" rows={r.persons} onChange={v=>update('persons',v)} title="Add person"/>
                      </ReportDetailRow>
                    </Card>
                    <Card title="Opening paragraph" subtitle="Generated from the requester, inspection location and visit date.">
                      <div className="generated-copy"><span><Link2 size={15}/> Automatically linked</span><p>{narrative(r)}</p><small>The full address remains in the details table. This paragraph uses the organization, locality and state.</small></div>
                    </Card>
                    <Card title="1.0 Stage of inspection" subtitle="Select every stage covered by this visit." number="1.0">
                      <div data-field-path="stages" className="stage-grid">{stages.map(stage=><label className={`stage-option ${r.stages.includes(stage)?'checked':''}`} key={stage}><input type="checkbox" checked={r.stages.includes(stage)} onChange={()=>update('stages',r.stages.includes(stage)?r.stages.filter(x=>x!==stage):[...r.stages,stage])}/><span className="custom-check">{r.stages.includes(stage)&&<Check size={14}/>}</span><span>{stage}</span></label>)}</div>
                    </Card>
                  </>}

                  {isStepVisible(1) && (
                    <>
                      <Card
                        title="2.0 Name of Equipment / Inspected Item:"
                        subtitle="Use the PO item number, equipment description and three quantities. Include units, for example 02 Nos."
                        number="2.0"
                      >
                        <EditableTable
                          type="equipment"
                          rows={r.equipment}
                          onChange={v => update('equipment', v)}
                          title="Add equipment row"
                        />
                      </Card>

                      <Card
                        title="3.0 Reference Documents:"
                        subtitle="List the standards, drawings, QAP and test schedules used for this inspection."
                        number="3.0"
                      >
                        <div className="single-field">
                          {field('standards', 'Reference Standards: (Top row of Table 3.0 — optional)', {
                            ariaLabel: 'Reference standards',
                            type: 'textarea',
                            placeholder: 'Leave blank if not required (as in the sample transformer report), or enter applicable standards e.g. IS 2026 / IEC 60076',
                            rows: 2,
                            hint: 'Prints in the first row of Table 3.0 as "Reference Standards: [your text]".'
                          })}
                        </div>
                        <EditableTable
                          type="documents"
                          rows={r.documents}
                          onChange={v => update('documents', v)}
                          title="Add document row"
                        />
                      </Card>

                      <div className="info-note">
                        <Plus size={18} />
                        <p>All dates in Table 3.0 can be either typed/edited directly (e.g. 28.05.2026) or selected from the calendar icon.</p>
                      </div>
                    </>
                  )}

                  {isStepVisible(2) && (
                    <>
                      <Card
                        title="4.0 Inspection Activities as per ITP/QAP/MQP:"
                        subtitle="Enter the QAP group and subgroup, then list each activity, its clause, check coverage and inspection scope."
                        number="4.0"
                      >
                        <div className="scope-legend">
                          <b>Scope codes:</b>
                          <span><b>R</b> · Review</span>
                          <span><b>W</b> · Witness</span>
                          <span><b>RW</b> · Random Witness</span>
                          <span><b>V</b> · Verification</span>
                          <span><b>H</b> · Hold</span>
                        </div>
                        <div className="activity-headings form-grid">
                          {field('activityGroupCode','Group clause',{placeholder:'e.g. B',alwaysBold:true})}
                          {field('activityGroup','Group heading',{placeholder:'e.g. IN-PROCESS',alwaysBold:true})}
                          {field('activitySubgroupCode','Subgroup clause',{placeholder:'e.g. 4',alwaysBold:true})}
                          {field('activitySubgroup','Subgroup heading',{placeholder:'e.g. TANKING',alwaysBold:true})}
                        </div>
                        <EditableTable
                          type="activities"
                          rows={r.activities}
                          onChange={v => update('activities', v)}
                          title="Add activity row"

                        />
                      </Card>

                      <Card title="5.0 Details of activities carried out" subtitle="The original report text is included automatically. Its bullets, heading and QAP emphasis are preserved." number="5.0">
                        <div className="activity-mode" data-field-path="activityDetails" tabIndex={0}>
                          <span className="template-text-badge"><ShieldCheck size={16}/>{r.activityDetailsMode==='template'?'Original template text':'Custom text for this report'}</span>
                          {r.activityDetailsMode==='custom'&&<Button onClick={()=>setModal({type:'reset-5.0'})}>Restore original text</Button>}
                        </div>
                        {r.activityDetailsMode==='custom'?<><p className="custom-activity-note">This report has custom activity text. Restore the original text to use section 5.0 exactly as supplied in FINAL_DOC.docx.</p>{field('activityDetails','Activity details',{ariaLabel:'Activity details',type:'textarea',required:true,rows:15})}</>:<FormattedActivityPreview text={activityDetailsText(r)}/>}
                      </Card>
                    </>
                  )}

                  {isStepVisible(3) && (
                    <>
                      <Card
                        title="6.0 Calibration Details:"
                        subtitle="Identify each instrument and enter its calibration and due dates."
                        number="6.0"
                      >
                        <EditableTable
                          type="calibration"
                          rows={r.calibration}
                          onChange={v => update('calibration', v)}
                          title="Add instrument row"
                        />
                        <div className="fixed-remark">
                          <ShieldCheck size={18} />
                          <p><strong>{calibrationRemark}</strong></p>
                        </div>
                        {r.calibration.some(x => {
                          const due = parseDateToIso(x.due) || x.due;
                          const insp = parseDateToIso(r.inspectionDate) || r.inspectionDate;
                          return due && insp && due < insp;
                        }) && (
                          <div className="warning-note">
                            <AlertCircle size={18} />
                            An instrument was past its calibration due date on the inspection date. Review and document the finding.
                          </div>
                        )}
                      </Card>

                      <Card
                        title="Inspection findings"
                        subtitle="These fields follow the calibration table in the report. Review the standard text for this inspection."
                        number="OUT"
                      >
                        <div className="form-grid">
                          {field('conclusion', 'Conclusion:', {
                            ariaLabel: 'Conclusion',
                            required: true,
                            wide: true,
                            type: 'textarea',
                            rows: 4,
                            placeholder: defaultConclusion
                          })}
                          {field('pending', 'Pending Activities:', {
                            ariaLabel: 'Pending activities',
                            type: 'textarea',
                            rows: 2,
                            placeholder: defaultPending,
                            wide: true
                          })}
                          {field('identification', 'Identification of the Inspected Items:', {
                            ariaLabel: 'Identification of inspected items',
                            type: 'text',
                            placeholder: 'NIL',
                            wide: true
                          })}
                          {field('nonconformities', 'Non-Conformities raised / Discrepancies observed during Inspection:', {
                            ariaLabel: 'Non-conformities / discrepancies observed',
                            type: 'text',
                            placeholder: 'NIL',
                            wide: true
                          })}
                          {field('enclosures', 'Enclosure: (One bullet item per line)', {
                            ariaLabel: 'Enclosures',
                            type: 'textarea',
                            rows: 3,
                            placeholder: defaultEnclosures,
                            wide: true,
                            hint: 'Each line is formatted with a bullet point (•) inside the bordered Enclosure box in Word and PDF.'
                          })}
                        </div>
                      </Card>
                    </>
                  )}

                  {isStepVisible(4) && (
                    <>
                      <Card
                        title="7.0 Inspection Photographs:"
                        subtitle="Optional. Add photographs in report order, with a description below each image."
                        number="7.0"
                        action={<span className="subtle-count">{r.photos.length} photos</span>}
                      >
                        <div
                          data-field-path="photos" tabIndex={0} className="upload-zone"
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => {
                            e.preventDefault();
                            if (!busy) uploadPhotos(Array.from(e.dataTransfer.files));
                          }}
                        >
                          <span className="upload-icon"><ImagePlus size={30} /></span>
                          <h3>Upload inspection photographs</h3>
                          <p>Drag and drop inspection photographs here, or click below to browse</p>
                          <Button icon={Plus} className="primary" disabled={!!busy} onClick={() => fileRef.current.click()}>
                            {busy === 'photos' ? 'Processing images…' : 'Choose photographs'}
                          </Button>
                          <small>JPG, PNG or WebP · Up to 15 MB per image · Exported in 2-column bordered table</small>
                          <input
                            hidden
                            multiple
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            ref={fileRef}
                            onChange={e => {
                              uploadPhotos(Array.from(e.target.files));
                              e.target.value = '';
                            }}
                          />
                        </div>
                      </Card>

                      {!!r.photos.length && (
                        <div className="photo-grid">
                          {r.photos.map((p, i) => (
                            <div className="photo-card" key={p.id}>
                              <div className="photo-image">
                                <img src={p.data} alt={p.caption || `Inspection photograph ${i + 1}`} />
                                <span className="photo-number">Photo {String(i + 1).padStart(2, '0')}</span>
                              </div>
                              <div className="photo-body">
                                <div className="photo-filename" title={p.name}>{p.name}</div>
                                <Field
                                  path={`photos.${p.id}.caption`} label="Photograph description"
                                  ariaLabel="Photograph description"
                                  required
                                  alwaysBold
                                  value={p.caption}
                                  type="textarea"
                                  rows={2}
                                  placeholder="e.g. Core Coil Assembly after ovening in Tank&#10;Job No.6393/01"
                                  onChange={v => update('photos', r.photos.map(x => x.id === p.id ? {...x, caption: v} : x))}
                                />
                                <div className="photo-actions">
                                  <span>Cell {i + 1} of {r.photos.length} ({i % 2 === 0 ? 'Left column' : 'Right column'})</span>
                                  <div>
                                    <button
                                      className="icon-button"
                                      aria-label={`Move photograph ${i + 1} up`}
                                      disabled={i === 0}
                                      onClick={() => {
                                        const arr = [...r.photos];
                                        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                                        update('photos', arr);
                                      }}
                                    >
                                      <MoveUp size={16} />
                                    </button>
                                    <button
                                      className="icon-button"
                                      aria-label={`Move photograph ${i + 1} down`}
                                      disabled={i === r.photos.length - 1}
                                      onClick={() => {
                                        const arr = [...r.photos];
                                        [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
                                        update('photos', arr);
                                      }}
                                    >
                                      <MoveDown size={16} />
                                    </button>
                                    <button
                                      className="icon-button danger"
                                      aria-label={`Remove photograph ${i + 1}`}
                                      onClick={() => setModal({type:'remove-photo',id:p.id})}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {isStepVisible(5) && (
                    <>
                      <Card
                        title="8.0 Expenditure Report:"
                        subtitle="Enter one row per visit. Include the visit date, time on site, travel time and round-trip distance."
                        number="8.0"
                      >
                        <EditableTable
                          type="expenses"
                          rows={r.expenses}
                          onChange={v => update('expenses', v)}
                          title="Add expenditure row"
                        />
                      </Card>

                      <Card
                        title="Report Sign-Off (Inspected By & Reviewed By)"
                        subtitle="Enter the inspector and reviewer names, sign-off dates, and optional signatures."
                        number="SIG"
                      >
                        <div className="signoff-grid">
                          {[['inspector', 'Inspected By:'], ['reviewer', 'Reviewed By:']].map(([key, label]) => (
                            <div className="signoff-column" key={key}>
                              <span className="signoff-label"><Users size={17} />{label}</span>
                              {field(key, 'Name', {
                                ariaLabel: 'Name',
                                required: true,
                                placeholder: key === 'inspector' ? 'e.g. Sudhakar Joshi' : 'e.g. Hitesh Prajapati'
                              })}
                              {field(`${key}Date`, 'Date', {
                                ariaLabel: 'Date',
                                required: true,
                                type: 'date'
                              })}
                              <div className="signature-box">
                                {r[`${key}Signature`] ? (
                                  <>
                                    <img src={r[`${key}Signature`]} alt={`${label} signature`} />
                                    <button
                                      className="icon-button danger"
                                      aria-label={`Remove ${label.toLowerCase().replace(':', '')} signature`}
                                      onClick={() => update(`${key}Signature`, '')}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <label className="signature-upload">
                                    <Upload size={22} />
                                    <span>Upload signature / stamp image</span>
                                    <small>Optional · JPG, PNG or WebP</small>
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      onChange={e => {
                                        signature(`${key}Signature`, e.target.files[0]);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </>
                  )}

                  {isStepVisible(6) && (
                    <>
                      <div className={`review-banner ${reportIssues.length ? 'incomplete' : 'complete'}`}>
                        <span>{reportIssues.length ? <ClipboardCheck size={28} /> : <CheckCircle2 size={28} />}</span>
                        <div>
                          <h3>{reportIssues.length ? `${reportIssues.length} details to complete` : 'Your report is ready to export'}</h3>
                          <p>{reportIssues.length ? 'Review the fields below before the final export. You can download a draft at any time.' : 'The required details are complete. Preview the PDF and check your findings before issuing.'}</p>
                        </div>
                      </div>

                      {(r.completedSteps||[]).filter(i=>i<6).length<6&&<div className="review-steps-note"><h3>Review the remaining steps</h3><p>Use “Complete step & continue” after checking each section. Optional sections can be completed without adding rows or photographs.</p><div>{sections.slice(0,6).map((title,i)=>!stepDone(r,i)&&<Button key={i} onClick={()=>navigate(i)}>Step {i+1}: {title}</Button>)}</div></div>}
                      {!!reportIssues.length && (
  
                      <Card title="Complete your report">
                          <ul className="issues-list">
                            {reportIssues.map((x, i) => (
                              <li key={i}>
                                <AlertCircle size={16} />
                                <span>{x.message}</span>
                                <button onClick={() => { setShowAllSteps(false); setFormSearch(''); navigate(x.section); }}>Edit <ArrowRight size={14} /></button>
                              </li>
                            ))}
                          </ul>
                        </Card>
                      )}

                      <Card
                        title="Report at a glance"
                        action={<Button icon={Eye} disabled={!!busy} onClick={()=>preview(r)}>{busy === 'preview' ? 'Preparing…' : 'Preview PDF'}</Button>}
                      >
                        <div className="summary-grid">
                          {[
                            ['Report number', r.reportNo],
                            ['Report date', displayDate(r.reportDate)],
                            ['Client', r.client],
                            ['Project', r.project],
                            ['Inspection location', location(r, true)],
                            ['Inspection date', displayDate(r.inspectionDate)],
                            ['Stages', r.stages.join(', ')],
                            ['Inspected by', r.inspector],
                            ['Reviewed by', r.reviewer]
                          ].map(([label, v]) => (
                            <div key={label}>
                              <span>{label}</span>
                              <p>{v || '—'}</p>
                            </div>
                          ))}
                        </div>
                        <div className="report-counts">
                          {[
                            [r.equipment.length, 'Items'],
                            [r.documents.length, 'Documents'],
                            [r.activities.length, 'Activities'],
                            [r.photos.length, 'Photographs']
                          ].map(([n, s]) => (
                            <div key={s}><b>{n}</b><span>{s}</span></div>
                          ))}
                        </div>
                      </Card>

                      <Card title="Download your report" subtitle="Word uses your original document template. PDF is generated with full AES report borders, tables, and formatting.">
                        <div className="export-grid">
                          <div className="export-card">
                            <span className="export-file word-file">W</span>
                            <h3>Word document (.docx)</h3>
                            <p>Editable .docx with the original styles, tables, header, logo, bullets, and footer.</p>
                            <Button className="primary" icon={Download} disabled={!!busy} onClick={() => exportReport('word')}>
                              {busy === 'word' ? 'Preparing…' : 'Download Word'}
                            </Button>
                            <button className="text-button" disabled={!!busy} onClick={() => exportReport('word', true)}>Download draft</button>
                          </div>
                          <div className="export-card">
                            <span className="export-file pdf-file">PDF</span>
                            <h3>PDF report (.pdf)</h3>
                            <p>Shareable PDF with bordered tables, formatted Section 5.0, bordered photo grid, and sign-off table.</p>
                            <Button icon={Download} disabled={!!busy} onClick={() => exportReport('pdf')}>
                              {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
                            </Button>
                            <button className="text-button" disabled={!!busy} onClick={() => exportReport('pdf', true)}>Download draft</button>
                          </div>
                        </div>
                        <div className="export-note">
                          <AlertCircle size={16} />
                          <p>Word controls the final pagination of the original template. For an exact Word-to-PDF conversion, open the .docx in Microsoft Word and choose Save as PDF.</p>
                        </div>
                        {!reportIssues.length && sections.slice(0,6).every((_,i)=>stepDone(r,i)) && (
                          <Button
                            className={r.status === 'ready' ? 'ready-button' : 'primary'}
                            icon={CheckCircle2}
                            onClick={() => {
                              setDirty(false);
                              setReports(prev => prev.map(x => x.id === r.id ? {...x, status: 'ready', completedSteps:[0,1,2,3,4,5,6], updatedAt: new Date().toISOString()} : x));
                              alert('Report marked ready. Editing a field will return it to draft.');
                            }}
                          >
                            {r.status === 'ready' ? 'Marked ready' : 'Mark as ready for export'}
                          </Button>
                        )}
                      </Card>
                    </>
                  )}

                  <div className="step-footer">
                    <Button icon={ArrowLeft} onClick={() => step === 0 ? closeEditor() : navigate(step - 1)}>
                      {step === 0 ? 'Back to reports' : 'Previous section'}
                    </Button>
                    <div className="footer-download-group">
                      <Button icon={Download} disabled={!!busy} onClick={() => exportReport('word', issues(r).length > 0)}>
                        Word (.docx)
                      </Button>
                      <Button icon={Download} disabled={!!busy} onClick={() => exportReport('pdf', issues(r).length > 0)}>
                        PDF (.pdf)
                      </Button>
                    </div>
                    {step < 6 || showAllSteps ? (
                      <Button className="primary next-button" onClick={completeCurrentStep}>
                        {showAllSteps?'Confirm all sections & continue':'Complete step & continue'} <ArrowRight size={16} />
                      </Button>
                    ) : (
                      <Button icon={LayoutDashboard} onClick={closeEditor}>Back to reports</Button>
                    )}
                  </div>
                </div>


              </div>
            </>
          )}
        </main>


      </div>

      <input hidden ref={importRef} type="file" accept="application/json,.json" onChange={restore} />

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={16} /></button>
        </div>
      )}

      {modal?.type==='leave-warning'&&<Modal title="Leave this report?" onClose={()=>setModal(null)}>
        <p className="modal-copy">{saveState==='saved'?'Your latest changes are saved in this browser. Save and close this draft, or stay here to continue editing.':'Your latest changes have not finished saving. Save the draft before leaving to keep your work.'}</p>
        <div className="modal-actions"><Button onClick={()=>setModal(null)}>Keep editing</Button><Button className="primary" icon={Check} onClick={async()=>{const next=modal.onConfirmLeave;if(await manualSave()){setModal(null);next?.();}}}>Save draft & leave</Button></div>
      </Modal>}
      {modal?.type==='remove-photo'&&<Modal title="Remove this photograph?" onClose={()=>setModal(null)}><p className="modal-copy">This removes the photograph and its description from the report.</p><div className="modal-actions"><Button onClick={()=>setModal(null)}>Keep photograph</Button><Button className="danger-button" onClick={()=>{update('photos',r.photos.filter(p=>p.id!==modal.id));setModal(null);}}>Remove photograph</Button></div></Modal>}

      {modal?.type==='report-actions'&&<Modal title="Report actions" onClose={()=>setModal(null)}>
        <p className="modal-copy">{reports.find(x=>x.id===modal.id)?.reportNo||'Untitled inspection report'}</p>
        <div className="modal-actions"><Button onClick={()=>setModal(null)}>Close</Button><Button icon={Copy} onClick={()=>{const report=reports.find(x=>x.id===modal.id);setModal(null);duplicate(report);}}>Duplicate report</Button><Button className="danger-button" icon={Trash2} onClick={()=>setModal({type:'delete',id:modal.id})}>Delete report</Button></div>
      </Modal>}

      {/* Confirmation before resetting Section 5.0 text */}
      {modal?.type === 'reset-5.0' && (
        <Modal title="Restore original Section 5.0 text?" onClose={() => setModal(null)}>
          <p className="modal-copy">
            This will replace your current edits in Section 5.0 (Details of activities carried out) with the default standard text.
          </p>
          <div className="modal-actions">
            <Button onClick={() => setModal(null)}>Cancel</Button>
            <Button
              className="primary"
              onClick={() => {
                setReports(prev=>prev.map(x=>x.id===activeId?{...x,activityDetails:defaultActivityDetails,activityDetailsMode:'template',completedSteps:(x.completedSteps||[]).filter(i=>i!==2&&i!==6),status:'draft',updatedAt:new Date().toISOString()}:x));setDirty(true);
                setModal(null);
                alert('Section 5.0 restored to standard text.');
              }}
            >
              Restore default 5.0 text
            </Button>
          </div>
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <Modal title="Delete this report?" onClose={() => setModal(null)}>
          <p className="modal-copy">This removes the report and its photographs from this browser. Download a backup first if you need a copy.</p>
          <div className="modal-actions">
            <Button onClick={() => setModal(null)}>Keep report</Button>
            <Button className="danger-button" icon={Trash2} onClick={() => remove(modal.id)}>Delete report</Button>
          </div>
        </Modal>
      )}

      {modal?.type === 'help' && (
        <Modal title="Reports & storage" onClose={() => setModal(null)}>
          <div className="help-content">
            <h3>Report workflow</h3>
            <p>Fields follow the same order as the AES inspection report. Dates can be typed directly or picked from the calendar, and Section 5.0 comes ready out of the box.</p>
            <h3>Keep a backup</h3>
            <p>Reports and photographs are saved in this browser on this device. Use Backup to download your editable reports, and Restore to import them elsewhere.</p>
            <h3>Export in your AES format</h3>
            <p>Word export fills a cleaned copy of FINAL_DOC.docx. PDF export recreates the full bordered AES layout with automatic page breaks.</p>
          </div>
          <div className="modal-actions">
            <Button icon={Download} disabled={!reports.length} onClick={() => backup(reports)}>Backup all reports</Button>
            <Button className="primary" onClick={() => setModal(null)}>Got it</Button>
          </div>
        </Modal>
      )}

      {modal?.type === 'preview' && (
        <Modal title="Report preview · PDF" onClose={() => setModal(null)}>
          <div className="preview-frame"><iframe src={pdfUrl} title="Inspection report PDF preview" /></div>
          <div className="modal-actions">
            <a className="button" href={pdfUrl} target="_blank" rel="noreferrer">Open PDF in a new tab <ArrowUpRight size={15} /></a>
            <Button className="primary" onClick={() => setModal(null)}>Back to report</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
