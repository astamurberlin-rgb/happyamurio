(function(){
'use strict';
const privacyUrl='https://astamurberlin-rgb.github.io/happyamurio/privacy/';
const accountScreens=HappyScreens.mount();
function privacyLink(text){
  const link=document.createElement('a');
  link.href=privacyUrl;
  link.target='_blank';
  link.rel='noopener';
  link.textContent=text;
  return link;
}
function updatePrivacyControls(){
  const remove=accountScreens.querySelector('[data-p="delete-account"]');
  if(remove&&!remove.parentElement.querySelector('.hs-policy-link')){
    const link=privacyLink('Политика конфиденциальности');
    link.className='hs-policy-link';
    remove.before(link);
  }
  const submit=accountScreens.querySelector('[data-hw="register"]');
  if(!submit)return;
  const form=submit.form;
  let consent=form.elements.privacyConsent;
  if(!consent){
    const label=document.createElement('label'),text=document.createElement('span');
    label.className='hs-privacy-consent';
    consent=document.createElement('input');
    consent.type='checkbox';
    consent.name='privacyConsent';
    consent.required=true;
    consent.addEventListener('change',updatePrivacyControls);
    text.append('Я принимаю ',privacyLink('политику конфиденциальности'));
    label.append(consent,text);
    form.querySelector('.hs-auth-fields').after(label);
  }
  const disabled=!consent.checked||submit.getAttribute('aria-busy')==='true';
  if(submit.disabled!==disabled)submit.disabled=disabled;
}
new MutationObserver(updatePrivacyControls).observe(accountScreens,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
accountScreens.addEventListener('submit',function(event){
  const form=event.target;
  if(form.querySelector('[data-hw="register"]')&&!form.elements.privacyConsent?.checked){
    event.preventDefault();
    event.stopImmediatePropagation();
    form.elements.privacyConsent?.reportValidity();
  }
},true);

})();
