
function storageGet(key){try{return localStorage.getItem(key)}catch(error){return null}}
function storageSet(key,value){try{localStorage.setItem(key,value)}catch(error){}}

const slides=[...document.querySelectorAll('.home-hero .slide')];
const dots=document.querySelector('.hero-dots');
let slideIndex=0;
function showSlide(i){if(!slides.length)return;slideIndex=(i+slides.length)%slides.length;slides.forEach((s,n)=>s.classList.toggle('active',n===slideIndex));if(dots)dots.querySelectorAll('button').forEach((b,n)=>b.classList.toggle('active',n===slideIndex));}
if(slides.length&&dots){slides.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.addEventListener('click',()=>showSlide(i));dots.appendChild(b)});showSlide(0);setInterval(()=>showSlide(slideIndex+1),5200);}
document.querySelector('.hero-arrow.next')?.addEventListener('click',()=>showSlide(slideIndex+1));
document.querySelector('.hero-arrow.prev')?.addEventListener('click',()=>showSlide(slideIndex-1));

const toTop=document.querySelector('.to-top');
function syncToTop(){toTop?.classList.toggle('visible',scrollY>240);}
toTop?.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
addEventListener('scroll',syncToTop,{passive:true});
syncToTop();

function initLanguageSwitch(){
  const file=(location.pathname.split('/').pop()||'index.html');
  const isEnglish=file.startsWith('en-');
  document.querySelectorAll('[data-lang-switch]').forEach(link=>{
    const target=isEnglish?file.slice(3):`en-${file}`;
    link.textContent=isEnglish?'DE':'EN';
    link.href=target+location.hash;
  });
}

function initQuizAdvisor(){
  const root=document.querySelector('[data-quiz-advisor]');
  const data=window.RGLOCK_QUIZ;
  if(!root||!data)return;
  const models=data.models||[];
  const questions=data.questions||[];
  const copy=data.copy||{};
  const state={step:0,answers:[]};
  const questionPanel=root.querySelector('[data-quiz-question]');
  const resultPanel=root.querySelector('[data-quiz-result]');
  const progress=root.querySelector('[data-quiz-progress]');
  const bar=root.querySelector('[data-quiz-bar]');
  const history=root.querySelector('[data-quiz-history]');
  const back=root.querySelector('[data-quiz-back]');
  const tagList=model=>new Set(model.tags||[]);
  function scoreModel(model){
    let score=0;
    const tags=tagList(model);
    state.answers.forEach(answer=>{
      Object.entries(answer.tags||{}).forEach(([tag,value])=>{if(tags.has(tag))score+=Number(value)||0;});
      if(answer.models&&(answer.models[model.id]||answer.models[model.name]))score+=Number(answer.models[model.id]||answer.models[model.name])||0;
    });
    if(tags.has('balanced'))score+=0.15;
    if(tags.has('9mm'))score+=0.1;
    return score;
  }
  function rankedModels(){
    return models.map(model=>({...model,score:scoreModel(model)})).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
  }
  function syncTop(){
    if(progress)progress.textContent=`${state.step+1} / ${questions.length}`;
    if(bar)bar.style.width=`${Math.round((state.step/questions.length)*100)}%`;
    if(back)back.style.visibility=state.step===0?'hidden':'visible';
    if(history){
      if(!state.answers.length){history.textContent=copy.history||'';return;}
      const word=state.answers.length===1?(copy.saved_singular||'answer saved.'):(copy.saved_plural||'answers saved.');
      history.textContent=`${state.answers.length} ${word}`;
    }
  }
  function renderQuestion(){
    const q=questions[state.step];
    if(!q)return;
    resultPanel.classList.remove('active');
    resultPanel.innerHTML='';
    syncTop();
    questionPanel.style.display='block';
    questionPanel.innerHTML=`
      <div class="kicker">${q.kicker||''}</div>
      <h2>${q.title}</h2>
      <div class="choices">
        ${(q.options||[]).map((option,index)=>`
          <button class="choice" type="button" data-index="${index}">
            <strong>${option.label}</strong>
            <span>${option.text}</span>
          </button>
        `).join('')}
      </div>`;
    questionPanel.querySelectorAll('.choice').forEach(button=>{
      button.addEventListener('click',()=>{
        state.answers[state.step]=(q.options||[])[Number(button.dataset.index)];
        state.step++;
        if(state.step>=questions.length)renderResult();else renderQuestion();
      });
    });
  }
  function renderResult(){
    const ranked=rankedModels();
    const best=ranked[0];
    const alternatives=ranked.slice(1,6);
    if(!best)return;
    questionPanel.style.display='none';
    if(progress)progress.textContent=copy.complete||'Complete';
    if(bar)bar.style.width='100%';
    if(back)back.style.visibility='visible';
    if(history)history.textContent=copy.result_history||'Result created.';
    resultPanel.classList.add('active');
    resultPanel.innerHTML=`
      <div class="result-grid">
        <div class="result-card">
          <div class="kicker">${copy.result||'Recommended model'}</div>
          <h2>${best.name}</h2>
          <p>${best.desc}</p>
          <div class="model-meta">
            <span class="pill">${best.caliber}</span>
            <span class="pill">${best.size}</span>
            <span class="pill">${copy.score||'Score'} ${Math.round(best.score)}</span>
          </div>
          <div class="result-actions">
            <a class="solid-btn" href="${best.href}">${best.name}</a>
            <button class="outline-btn" type="button" data-quiz-restart>${copy.restart||'Restart advisor'}</button>
          </div>
        </div>
        <aside class="alt-box">
          <h3>${copy.alternatives||'Close alternatives'}</h3>
          <div class="alt-list">
            ${alternatives.map(model=>`
              <a class="alt-item" href="${model.href}">
                <b><span>${model.name}</span><span>${Math.round(model.score)}</span></b>
                <span>${model.caliber} · ${model.size}</span>
              </a>`).join('')}
          </div>
        </aside>
      </div>`;
    resultPanel.querySelector('[data-quiz-restart]')?.addEventListener('click',()=>{
      state.step=0;
      state.answers=[];
      renderQuestion();
      root.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
  back?.addEventListener('click',()=>{
    if(state.step>=questions.length){
      state.step=questions.length-1;
      state.answers=state.answers.slice(0,state.step);
      renderQuestion();
      return;
    }
    if(state.step>0){
      state.step--;
      state.answers=state.answers.slice(0,state.step);
      renderQuestion();
    }
  });
  renderQuestion();
}

function initSearchPage(){
  const page=document.querySelector('.search-page');
  if(!page)return;
  const form=page.querySelector('[data-search-form]');
  const input=page.querySelector('#siteSearch');
  const tabs=[...page.querySelectorAll('[data-search-category]')];
  const cards=[...page.querySelectorAll('[data-search-card]')];
  const count=page.querySelector('[data-search-count]');
  const empty=page.querySelector('[data-search-empty]');
  const params=new URLSearchParams(location.search);
  let category=params.get('category')||'products';
  if(!tabs.some(tab=>tab.dataset.searchCategory===category))category='products';
  if(params.has('q'))input.value=params.get('q');
  function applySearch(pushState){
    const query=input.value.trim().toLowerCase();
    let shown=0;
    tabs.forEach(tab=>tab.classList.toggle('active',tab.dataset.searchCategory===category));
    cards.forEach(card=>{
      const text=card.dataset.search||card.textContent.toLowerCase();
      const visible=Boolean(query)&&card.dataset.category===category&&text.includes(query);
      card.hidden=!visible;
      if(visible)shown++;
    });
    if(count){count.hidden=!query;count.textContent=query?`${shown} result${shown===1?'':'s'} found`:'';}
    if(empty)empty.hidden=!query||shown>0;
    if(pushState){
      const url=new URL(location.href);
      if(query)url.searchParams.set('q',input.value.trim());else url.searchParams.delete('q');
      url.searchParams.set('category',category);
      history.replaceState(null,'',url);
    }
  }
  form?.addEventListener('submit',event=>{event.preventDefault();applySearch(true);});
  tabs.forEach(tab=>tab.addEventListener('click',()=>{category=tab.dataset.searchCategory;applySearch(true);}));
  applySearch(false);
}

function initDealerLocator(){
  const gate=document.querySelector('[data-age-gate]');
  if(!gate)return;
  const form=document.querySelector('[data-age-form]');
  const input=document.querySelector('[data-age-year]');
  const error=document.querySelector('[data-age-error]');
  const ageKey='rglockDealerAgeVerified';
  if(storageGet(ageKey)==='1')gate.classList.add('hidden');
  input?.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,4);if(error)error.hidden=true;});
  form?.addEventListener('submit',event=>{
    event.preventDefault();
    const year=Number(input.value);
    const currentYear=new Date().getFullYear();
    const validYear=input.value.length===4&&year>1900&&year<=currentYear;
    const oldEnough=validYear&&year<=currentYear-21;
    if(oldEnough){storageSet(ageKey,'1');gate.classList.add('hidden');return;}
    if(error){error.textContent=validYear?'Sorry, you are not old enough to access this website.':'Please enter a valid year after 1900.';error.hidden=false;}
  });

  const cookieKey='rglockCookieChoice';
  const cookieBar=document.querySelector('[data-cookie-bar]');
  const cookieChip=document.querySelector('[data-cookie-chip]');
  function syncCookies(){
    const hasChoice=Boolean(storageGet(cookieKey));
    cookieBar?.classList.toggle('hidden',hasChoice);
    cookieChip?.classList.toggle('hidden',!hasChoice);
  }
  document.querySelectorAll('[data-cookie-choice]').forEach(button=>{
    button.addEventListener('click',()=>{storageSet(cookieKey,button.dataset.cookieChoice||'set');syncCookies();});
  });
  cookieChip?.addEventListener('click',()=>{cookieBar?.classList.remove('hidden');cookieChip.classList.add('hidden');});
  syncCookies();
}

initSearchPage();
initDealerLocator();
initLanguageSwitch();
initQuizAdvisor();
