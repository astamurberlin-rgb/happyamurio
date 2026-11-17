/* Лаборатория одного приложения (Day, Meal или Sport): сама входит вымышленным аккаунтом лаборатории.
 * Только для закрытой страницы лаборатории (scripts/lab/build-app-lab.py). В выпуски не попадает: на сайте вход обычный.
 * Делает то же, что человек руками: «Уже есть аккаунт? Войти» → «Проверка» → «Заполнить пример» → «Войти».
 * — Claude · 16.11.2026, для трёх приложений — 17.11.2026 */
(function(){
'use strict';
var tries=0,timer=setInterval(step,250);
function step(){
 if(++tries>80){clearInterval(timer);return}
 var toLogin=document.querySelector('[data-hw="to-login"]');
 if(toLogin&&toLogin.offsetParent){toLogin.click();return}
 var email=document.querySelector('#happy-screens [name="email"]'),pass=document.querySelector('#happy-screens [name="password"]');
 if(!email||!email.offsetParent){if(tries>12)clearInterval(timer);return}
 if(!pass.value){var labBtn=document.getElementById('happy-lab-button');if(!labBtn)return;labBtn.click();var fill=document.querySelector('[data-lab="fill"]');if(fill)fill.click();return}
 var form=email.closest('form'),submit=form&&form.querySelector('button[type=submit]');
 if(submit){clearInterval(timer);submit.click()}
}
})();
