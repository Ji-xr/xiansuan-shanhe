import {PHOTOS,photoMarkup} from './region-photos.js';
const el=document.querySelector('#case-photos');if(el)el.innerHTML=Object.keys(PHOTOS).map(id=>photoMarkup(id,{linkCase:true})).join('');
