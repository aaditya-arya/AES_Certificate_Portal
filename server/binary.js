export const fromBase64=value=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));
export function toBase64(bytes){let value='';for(let offset=0;offset<bytes.length;offset+=8192)value+=String.fromCharCode(...bytes.subarray(offset,offset+8192));return btoa(value);}
export const toHex=bytes=>Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
export const ascii=bytes=>new TextDecoder().decode(bytes);
