/* RFC 5545 export. Stable UIDs identify updates; importing remains the calendar's job. */
function calendarEscape(s){return String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
function calendarFold(line){let out='',bytes=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){out+='\r\n ';bytes=1;}out+=char;bytes+=size;}return out;}
function calendarWall(s){return s.slice(0,16).replace(/[-:]/g,'')+'00';}
function calendarStamp(d){return d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');}
function calendarOffset(ms,zone){return (Date.parse(wallInZone(new Date(ms),zone)+'Z')-Math.floor(ms/1000)*1000)/60000;}
function calendarOffsetText(minutes){return (minutes<0?'-':'+')+String(Math.floor(Math.abs(minutes)/60)).padStart(2,'0')+String(Math.abs(minutes)%60).padStart(2,'0');}
function calendarTimezone(zone,year,endYear){
 const start=Date.UTC(year-1,0,1),end=Date.UTC(Math.min(year+12,endYear+2),0,1),transitions=[];let previous=calendarOffset(start,zone);
 for(let ms=start+86400000;ms<=end;ms+=86400000){const offset=calendarOffset(ms,zone);if(offset!==previous){let low=ms-86400000,high=ms;while(high-low>1000){const mid=Math.floor((low+high)/2000)*1000;if(calendarOffset(mid,zone)===previous)low=mid;else high=mid;}transitions.push({at:high,from:previous,to:offset});previous=offset;}}
 const rows=['BEGIN:VTIMEZONE','TZID:'+zone,'X-LIC-LOCATION:'+zone];const first=calendarOffset(start,zone);rows.push('BEGIN:STANDARD','DTSTART:'+calendarWall(new Date(start+first*60000).toISOString()),'TZOFFSETFROM:'+calendarOffsetText(first),'TZOFFSETTO:'+calendarOffsetText(first),'END:STANDARD');
 for(const t of transitions){const type=t.to>t.from?'DAYLIGHT':'STANDARD';rows.push('BEGIN:'+type,'DTSTART:'+calendarWall(new Date(t.at+t.from*60000).toISOString()),'TZOFFSETFROM:'+calendarOffsetText(t.from),'TZOFFSETTO:'+calendarOffsetText(t.to),'END:'+type);}
 rows.push('END:VTIMEZONE');return rows;
}
function scheduleCalendar(s,now=new Date()){
 validateSchedule(s);const t=templates().find(t=>t.id===s.templateId),date=scheduleDates(s,s.startDate,plusDays(s.startDate,7))[0];if(!date)throw new Error('В выбранном периоде нет занятий.');
 const horizon=plusDays(s.startDate,3650),exportEnd=s.endDate&&s.endDate<horizon?s.endDate:horizon;
 const zone=s.timeZone,year=Number(s.startDate.slice(0,4)),endYear=Number(exportEnd.slice(0,4));
 const rows=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Happy Sport//Schedule//RU','CALSCALE:GREGORIAN',...calendarTimezone(zone,year,endYear)];
 const uid=s.id+'@happy-sport',stamp=calendarStamp(now),baseStart=date+'T'+s.time;
 const alarm=()=>s.reminder<0?[]:['BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-PT'+s.reminder+'M','DESCRIPTION:'+calendarEscape(t?.title||'Тренировка'),'END:VALARM'];
 const event=(start,minutes,note,recurrence=null)=>['BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+stamp,'SEQUENCE:'+((s.revision||0)+(recurrence?.revision||0)),...(recurrence?['RECURRENCE-ID;TZID='+zone+':'+calendarWall(recurrence.originalStart)]:[]),'DTSTART;TZID='+zone+':'+calendarWall(start),'DURATION:PT'+minutes+'M','SUMMARY:'+calendarEscape(t?.title||'Тренировка'),'DESCRIPTION:'+calendarEscape(note||'')];
 rows.push(...event(baseStart,s.minutes,s.note));
 if(s.mode==='weekly'){const names=['SU','MO','TU','WE','TH','FR','SA'];rows.push('RRULE:FREQ=WEEKLY;BYDAY='+s.days.map(d=>names[d]).join(',')+';UNTIL='+calendarStamp(zonedInstant(exportEnd+'T23:59',zone)));}
 const exceptions=Object.values(state.occurrences).filter(o=>o.scheduleId===s.id);
 for(const o of exceptions)if(['cancelled','skipped'].includes(o.status))rows.push('EXDATE;TZID='+zone+':'+calendarWall(o.originalStart||o.date+'T'+s.time));
 rows.push(...alarm(),'END:VEVENT');
 for(const o of exceptions){if(['cancelled','skipped'].includes(o.status))continue;const originalStart=o.originalStart||o.date+'T'+s.time;if(o.start===originalStart&&o.minutes===s.minutes&&o.note===s.note)continue;rows.push(...event(o.start,o.minutes||s.minutes,o.note,{...o,originalStart}),...alarm(),'END:VEVENT');}
 rows.push('END:VCALENDAR');return rows.map(calendarFold).join('\r\n')+'\r\n';
}
function planCalendar(t,now=new Date()){const s=templateSchedule(t.id);if(s)return scheduleCalendar(s,now);if(t.schedule){const v=t.schedule;return scheduleCalendar({id:'schedule-legacy-'+t.id,templateId:t.id,mode:'once',startDate:v.start.slice(0,10),time:v.start.slice(11,16),timeZone:'Europe/Moscow',days:[],endDate:'',minutes:v.minutes,reminder:v.reminder,note:v.note,revision:0},now);}return '';}
