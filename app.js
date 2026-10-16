(() => {
  const events = window.WORLD_DAYS_DATA || [];
  const $ = (s) => document.querySelector(s);
  const calendarGrid = $("#calendar-grid");
  const eventList = $("#event-list");
  const countryList = $("#country-list");
  const searchInput = $("#search");
  const dialog = $("#event-dialog");
  const dialogContent = $("#dialog-content");
  const today = new Date();
  let shownYear = today.getFullYear();
  let shownMonth = today.getMonth();
  let selectedDate = null;
  let activeView = "calendar";
  let query = "";

  const monthNames = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  const pad = n => String(n).padStart(2,"0");
  const dateKey = (year, month, day) => `${year}-${pad(month+1)}-${pad(day)}`;
  const formatDate = (date) => `${Number(date.slice(5,7))}月${Number(date.slice(8,10))}日`;
  const eventDate = e => `${shownYear}-${e.date}`;
  const eventMatchesQuery = e => !query || [e.country,e.countryEn,e.name,e.type,e.description,e.year].filter(Boolean).join(" ").toLocaleLowerCase("ja").includes(query.toLocaleLowerCase("ja"));
  const dateEvents = (year, month, day) => events.filter(e => e.date === `${pad(month+1)}-${pad(day)}` && eventMatchesQuery(e));
  const typeClass = type => type || "記念日";

  function eventCard(e, dateText) {
    return `<button class="event-card" data-event="${escapeHtml(e.id)}">
      <span class="flag">${e.flag || "🌐"}</span>
      <span class="event-main"><span class="event-title">${escapeHtml(e.country)}｜${escapeHtml(e.name)}</span>
      <span class="event-meta">${escapeHtml(e.countryEn || "")}${e.year ? " · 関連年 "+e.year+"年" : ""}</span>
      <span class="type-pill">${escapeHtml(typeClass(e.type))}</span></span>
      <span class="event-date">${dateText || formatDate(eventDate(e))}</span><span class="chevron">›</span>
    </button>`;
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function renderCalendar() {
    $("#month-title").textContent = `${shownYear}年 ${monthNames[shownMonth]}`;
    const first = new Date(shownYear, shownMonth, 1).getDay();
    const days = new Date(shownYear, shownMonth+1, 0).getDate();
    let html = "";
    for(let i=0;i<first;i++) html += '<div class="calendar-day empty" aria-hidden="true"></div>';
    for(let day=1;day<=days;day++) {
      const matches = dateEvents(shownYear, shownMonth, day);
      const key = dateKey(shownYear, shownMonth, day);
      const selected = selectedDate === key;
      const isSunday = (first + day - 1) % 7 === 0;
      const todayKey = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
      html += `<button class="calendar-day ${matches.length ? "has-event" : ""} ${selected ? "selected" : ""} ${isSunday ? "sunday" : ""}" data-date="${key}" aria-label="${shownMonth+1}月${day}日${matches.length ? "、記念日"+matches.length+"件" : ""}" aria-pressed="${selected}">
        <span class="day-number">${day}</span>${matches.length ? `<span class="day-dots">${Array.from({length:Math.min(matches.length,4)},()=>"<i></i>").join("")}</span><span class="day-count">${matches.length}件</span>` : ""}${key===todayKey?'<span class="day-count">今日</span>':""}</button>`;
    }
    calendarGrid.innerHTML = html;
    calendarGrid.querySelectorAll("[data-date]").forEach(btn => btn.addEventListener("click", () => {
      selectedDate = btn.dataset.date;
      renderCalendar();
      renderEventsForSelection();
    }));
    renderEventsForSelection();
  }
  function renderEventsForSelection() {
    let matches;
    let title;
    if(selectedDate) {
      const [y,m,d] = selectedDate.split("-").map(Number);
      matches = dateEvents(y,m-1,d);
      title = `${m}月${d}日の記念日`;
    } else {
      matches = events.filter(e => Number(e.date.slice(0,2)) === shownMonth+1 && eventMatchesQuery(e)).sort((a,b)=>a.date.localeCompare(b.date));
      title = `${shownYear}年${monthNames[shownMonth]}の記念日`;
    }
    $("#selected-date-title").textContent = title;
    $("#result-count").textContent = `${matches.length}件`;
    eventList.innerHTML = matches.length ? matches.map(e=>eventCard(e,formatDate(`${shownYear}-${e.date}`))).join("") : `<div class="empty-state">この条件に合う記念日は見つかりませんでした。検索語を変えてみてください。</div>`;
    bindEventCards(eventList);
  }
  function renderCountries() {
    const countries = [...new Map(events.filter(eventMatchesQuery).map(e => [e.country, {country:e.country,countryEn:e.countryEn,flag:e.flag,items:[]}])).values()];
    countries.forEach(c => c.items = events.filter(e=>e.country===c.country && eventMatchesQuery(e)));
    countries.sort((a,b)=>a.country.localeCompare(b.country,"ja"));
    $("#country-count").textContent = `${countries.length}か国`;
    countryList.innerHTML = countries.length ? countries.map(c=>`<button class="country-card" data-country="${escapeHtml(c.country)}"><span class="flag">${c.flag}</span><span class="country-main"><span class="country-title">${escapeHtml(c.country)}</span><span class="country-meta">${escapeHtml(c.countryEn)} · 記念日 ${c.items.length}件</span><span class="type-pill">${c.items.map(e=>escapeHtml(e.type)).filter((x,i,a)=>a.indexOf(x)===i).join("・")}</span></span><span class="chevron">›</span></button>`).join("") : '<div class="empty-state">該当する国がありません。</div>';
    countryList.querySelectorAll("[data-country]").forEach(btn=>btn.addEventListener("click",()=>{
      const name=btn.dataset.country;
      const items=events.filter(e=>e.country===name);
      dialogContent.innerHTML=`<div class="dialog-flag">${items[0].flag}</div><h2 class="dialog-title">${escapeHtml(name)}</h2><p class="dialog-meta">${escapeHtml(items[0].countryEn)} · 記念日 ${items.length}件</p><div class="dialog-section"><h3>登録されている記念日</h3>${items.map(e=>eventCard(e,formatDate(`${shownYear}-${e.date}`))).join("")}</div>`;
      dialog.showModal();
      bindEventCards(dialogContent);
    }));
  }
  function bindEventCards(root) {
    root.querySelectorAll("[data-event]").forEach(btn=>btn.addEventListener("click",()=>{
      const e=events.find(x=>x.id===btn.dataset.event);
      if(e) showEvent(e);
    }));
  }
  function showEvent(e) {
    dialogContent.innerHTML = `<div class="dialog-flag">${e.flag||"🌐"}</div><h2 class="dialog-title">${escapeHtml(e.country)}｜${escapeHtml(e.name)}</h2><p class="dialog-meta">${escapeHtml(e.countryEn||"")} · 毎年 ${formatDate(`${shownYear}-${e.date}`)} · ${escapeHtml(e.type)}</p>
      ${e.year?`<div class="dialog-section"><h3>関連年</h3><p>${e.year}年</p></div>`:""}
      <div class="dialog-section"><h3>由来・概要</h3><p>${escapeHtml(e.description)}</p></div>
      ${e.note?`<div class="dialog-section"><h3>補足</h3><p>${escapeHtml(e.note)}</p></div>`:""}
      <div class="dialog-section"><h3>出典・確認先</h3><p>このリンクは確認の起点です。掲載内容や年次の正確性は、公開前に公的資料で確認してください。</p>${(e.sources||[]).map(s=>`<a class="dialog-source" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)} ↗</a>`).join("")}</div>`;
    dialog.showModal();
  }
  function setView(view) {
    activeView = view;
    document.querySelectorAll(".tab").forEach(btn=>{
      const active = btn.dataset.view===view;
      btn.classList.toggle("active",active);
      btn.setAttribute("aria-selected",String(active));
    });
    $("#calendar-view").classList.toggle("hidden",view!=="calendar");
    $("#countries-view").classList.toggle("hidden",view!=="countries");
    if(view==="calendar") renderCalendar(); else renderCountries();
  }
  $("#prev-month").addEventListener("click",()=>{shownMonth--;if(shownMonth<0){shownMonth=11;shownYear--;}selectedDate=null;renderCalendar();});
  $("#next-month").addEventListener("click",()=>{shownMonth++;if(shownMonth>11){shownMonth=0;shownYear++;}selectedDate=null;renderCalendar();});
  $("#today-btn").addEventListener("click",()=>{shownYear=today.getFullYear();shownMonth=today.getMonth();selectedDate=null;renderCalendar();});
  document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.view)));
  searchInput.addEventListener("input",()=>{query=searchInput.value.trim();if(activeView==="calendar")renderCalendar();else renderCountries();});
  $("#close-dialog").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
  if("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
  renderCalendar();
})();
