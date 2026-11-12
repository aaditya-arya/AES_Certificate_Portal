export function focusableWithin(container) {
  return [...container.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]
    .filter(element=>!element.disabled&&element.tabIndex>=0&&!element.closest('[inert]')&&element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden');
}

export function containTab(event, container) {
  if(event.key!=='Tab')return;
  const items=focusableWithin(container);
  if(!items.length){event.preventDefault();container.focus();return;}
  const first=items[0],last=items.at(-1),active=document.activeElement;
  if(event.shiftKey&&(active===first||active===container||!container.contains(active))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(active===last||active===container||!container.contains(active))){event.preventDefault();first.focus();}
}

export function restoreFocus(element) {
  if(!element?.isConnected||element.closest('[inert]'))return;
  const bounds=element.getBoundingClientRect();
  if(bounds.width&&bounds.height&&bounds.right>0&&bounds.left<innerWidth&&getComputedStyle(element).visibility!=='hidden')element.focus({preventScroll:true});
}

let scrollLocks=0;
let initialOverflow='';
export function lockPageScroll() {
  if(scrollLocks++===0){initialOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
  return ()=>{if(--scrollLocks===0)document.body.style.overflow=initialOverflow;};
}
