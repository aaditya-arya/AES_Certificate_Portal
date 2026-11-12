import React, {useRef, useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {displayDate, parseDateToIso, isCapsText} from './model';

export function DateInput({id, ariaLabel, value, onChange, placeholder='DD.MM.YYYY', required=false, disabled=false, className=''}) {
  const picker = useRef(null);
  const errorId = React.useId();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const [touched, setTouched] = useState(false);
  const invalid = touched && Boolean(value) && !parseDateToIso(value);
  const openCalendar = () => {
    if (!picker.current || disabled) return;
    try { picker.current.showPicker(); }
    catch { picker.current.focus(); picker.current.click(); }
  };
  return <div className={`date-control ${className}`}>
    <div className="date-combo">
      <input id={id} type="text" inputMode="numeric" aria-label={ariaLabel} aria-required={required}
        aria-invalid={invalid || undefined} aria-describedby={invalid?errorId:undefined}
        placeholder={placeholder} disabled={disabled} value={focused?draft:displayDate(value)}
        onFocus={()=>{setFocused(true);setDraft(displayDate(value));}}
        onChange={e=>{setDraft(e.target.value);onChange(parseDateToIso(e.target.value)||e.target.value);}}
        onBlur={()=>{setFocused(false);setTouched(true);}}/>
      <button type="button" className="date-picker-btn" aria-label={`Open calendar for ${ariaLabel}`}
        title="Choose a date" disabled={disabled} onClick={openCalendar}><CalendarDays size={18}/></button>
      <input className="date-native-picker" ref={picker} type="date" tabIndex={-1}
        aria-label={`${ariaLabel} calendar selection`} value={parseDateToIso(value)} disabled={disabled}
        onChange={e=>{onChange(e.target.value);setFocused(false);setTouched(false);}}/>
    </div>
    {invalid&&<span id={errorId} className="field-error">Enter a real date, for example 07.11.2026, or use the calendar.</span>}
  </div>;
}

// Keep native textarea editing, selection, undo, and accessibility. A synchronized
// visual layer lets uppercase lines retain their document weight while typing.
export function ReportTextarea({value='',alwaysBold=false,className='',onChange,...props}) {
  const mirror = useRef(null);
  const lines = String(value).split('\n');
  return <div className={`report-textarea ${alwaysBold||isCapsText(value)?'typed-whole-bold':''} ${className}`}>
    <div className="textarea-mirror" aria-hidden="true" ref={mirror}>
      {value?lines.map((line,i)=><React.Fragment key={i}><span className={alwaysBold||isCapsText(line)?'typed-bold':''}>{line||'\u200b'}</span>{i<lines.length-1?'\n':''}</React.Fragment>):<span className="textarea-placeholder">{props.placeholder}</span>}{'\n'}
    </div>
    <textarea {...props} value={value} onChange={onChange}
      onScroll={e=>{if(mirror.current){mirror.current.scrollTop=e.target.scrollTop;mirror.current.scrollLeft=e.target.scrollLeft;}}}/>
  </div>;
}

export function ReportDetailRow({number,title,help,children}) {
  return <div className="detail-row"><div className="detail-row-label"><span>{String(number).padStart(2,'0')}</span><div><h3>{title}</h3>{help&&<p>{help}</p>}</div></div><div className="detail-row-fields">{children}</div></div>;
}
