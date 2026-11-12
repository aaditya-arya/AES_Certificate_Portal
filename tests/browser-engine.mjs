import {chromium,firefox} from '@playwright/test';
export const browserName=process.env.AES_BROWSER||'chromium';
export async function launchBrowser(){
  if(browserName==='firefox')return firefox.launch({headless:true});
  if(browserName!=='chromium')throw Error(`Unsupported test browser: ${browserName}`);
  return chromium.launch({headless:true,...(!process.env.CI?{channel:'chrome'}:{})});
}
