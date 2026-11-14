/* Sport 42 · без входа: на экране тренировок — предложение войти; записи без входа не принимаются (sport-data.js).
   Правки с другой вкладки или устройства, пришедшие при открытом окне, показываются после его закрытия. */
{const diaryBeforeSignIn=renderDiary;renderDiary=function(){
 const html=diaryBeforeSignIn();if(SportData.signedIn())return html;
 const card=`<section class="card sport-signin"><h3>Войди, чтобы записывать</h3><p class="sub">Записи Sport хранятся в аккаунте Happy — одном для Day, Meal и Sport. После входа запись работает и без сети.</p><button class="button primary" data-action="navigate" data-view="profile">Войти</button></section>`;
 const at=html.indexOf('</header>');return at<0?card+html:html.slice(0,at+9)+card+html.slice(at+9);
}}
{const closeBeforeAdopt=closeSheet;closeSheet=function(...args){const r=closeBeforeAdopt(...args);SportData.afterSheet();return r}}
