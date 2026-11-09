/* Общий словарь статусов Happy — одинаковые слова для одного и того же состояния в Day, Meal и Sport.
 * Приложение не пишет свои тексты статуса: оно называет состояние, модуль даёт текст и тип (для цвета/иконки).
 * Без слова «JSON» и без советов «выгрузи копию»: резервная копия — инструмент в разделе «Данные», не статус.
 * Подключение в выпусках — по мере перехода на общую оболочку (аудит 09.11.2026, раздел 3). */
(function(root){
  'use strict';
  var STATES={
    cloud:     {kind:'ok',   text:'Сохранено в облаке'},
    device:    {kind:'ok',   text:'Сохранено на устройстве'},
    saving:    {kind:'busy', text:'Сохраняю…'},
    preparing: {kind:'busy', text:'Готовлю синхронизацию…'},
    offline:   {kind:'warn', text:'Нет сети — сохранено на устройстве, в облако уйдёт при связи'},
    signin:    {kind:'warn', text:'Войди в аккаунт Happy, чтобы записи сохранялись в облаке'},
    authChanged:{kind:'warn',text:'Вход обновился в другом окне или приложении Happy — обновляю'},
    otherTab:  {kind:'warn', text:'Открыто в другой вкладке — здесь только просмотр'},
    conflict:  {kind:'warn', text:'Записи изменились на другом устройстве — объединяю'},
    full:      {kind:'error',text:'Нет места на устройстве — освободи память и повтори'},
    error:     {kind:'error',text:'Не удалось сохранить — повтори'}
  };
  function get(state){return STATES[state]||STATES.error;}
  /* text('offline') → строка; text('error', 'нет ответа сервера') → «Не удалось сохранить — повтори · нет ответа сервера» */
  function text(state,detail){var s=get(state);return detail?s.text+' · '+String(detail):s.text;}
  function kind(state){return get(state).kind;}
  /* Применить к элементу: textContent + data-status-kind для стилей (ok / busy / warn / error). */
  function apply(el,state,detail){if(!el)return;el.textContent=text(state,detail);el.dataset.statusKind=kind(state);return el;}
  root.HappyStatus={states:Object.keys(STATES),get:get,text:text,kind:kind,apply:apply};
})(typeof globalThis!=='undefined'?globalThis:this);
