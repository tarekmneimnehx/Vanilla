/* Vanilla Concept — shared behaviour */
(function(){"use strict";
window.VC_WHATSAPP="971500000000";

function applyLang(lang){
  var isAr=lang==="ar",root=document.documentElement;
  root.lang=lang;root.dir=isAr?"rtl":"ltr";
  document.querySelectorAll("[data-ar]").forEach(function(el){
    if(el.dataset.en===undefined)el.dataset.en=el.textContent;
    el.textContent=isAr?el.dataset.ar:el.dataset.en;
  });
  document.querySelectorAll("[data-ar-ph]").forEach(function(el){
    if(el.dataset.enPh===undefined)el.dataset.enPh=el.getAttribute("placeholder")||"";
    el.setAttribute("placeholder",isAr?el.getAttribute("data-ar-ph"):el.dataset.enPh);
  });
  document.querySelectorAll(".lang-toggle button").forEach(function(b){
    b.setAttribute("aria-pressed",String(b.dataset.lang===lang));
  });
  try{localStorage.setItem("vc-lang",lang);}catch(e){}
}
window.VC_setLang=applyLang;

function init(){
  var saved="en";try{saved=localStorage.getItem("vc-lang")||"en";}catch(e){}
  applyLang(saved);
  document.querySelectorAll(".lang-toggle button").forEach(function(b){
    b.addEventListener("click",function(){applyLang(b.dataset.lang);});
  });

  var burger=document.querySelector(".burger"),drawer=document.querySelector(".mobile-nav");
  if(burger&&drawer){
    burger.addEventListener("click",function(){drawer.classList.add("open");});
    drawer.querySelectorAll("a,.close").forEach(function(el){
      el.addEventListener("click",function(){drawer.classList.remove("open");});
    });
  }

  document.querySelectorAll("[data-year]").forEach(function(el){el.textContent=new Date().getFullYear();});

  /* hero slider */
  var hero=document.querySelector(".hero");
  if(hero){
    var slides=hero.querySelectorAll(".slide"),dots=hero.querySelectorAll(".hero-dots button"),i=0,timer;
    function go(n){
      i=(n+slides.length)%slides.length;
      slides.forEach(function(s,k){s.classList.toggle("on",k===i);});
      dots.forEach(function(d,k){d.setAttribute("aria-selected",String(k===i));});
    }
    function play(){clearInterval(timer);timer=setInterval(function(){go(i+1);},6500);}
    dots.forEach(function(d,k){d.addEventListener("click",function(){go(k);play();});});
    var prev=hero.querySelector("[data-prev]"),next=hero.querySelector("[data-next]");
    if(prev)prev.addEventListener("click",function(){go(i-1);play();});
    if(next)next.addEventListener("click",function(){go(i+1);play();});
    go(0);if(slides.length>1)play();
  }

  /* reveal */
  var root=document.documentElement;
  var reveals=Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}});},{threshold:.08,rootMargin:"0px 0px -6% 0px"});
  function revealInView(){
    var vh=window.innerHeight||root.clientHeight;
    reveals.forEach(function(el){
      if(el.classList.contains("in"))return;
      var r=el.getBoundingClientRect();
      if(r.top<vh*.96&&r.bottom>0)el.classList.add("in");
    });
  }
  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduce){reveals.forEach(function(el){el.classList.add("in");});}
  else{
    requestAnimationFrame(function(){
      root.classList.add("anim-ready");
      reveals.forEach(function(el){io.observe(el);});
      requestAnimationFrame(function(){requestAnimationFrame(revealInView);});
    });
  }
  window.addEventListener("load",function(){setTimeout(revealInView,80);});
  setTimeout(function(){reveals.forEach(function(el){el.classList.add("in");if(el.getAnimations)el.getAnimations().forEach(function(a){try{a.finish();}catch(e){}});});},2200);

  /* gallery filters */
  var filters=document.querySelector(".filter-row");
  if(filters){
    filters.addEventListener("click",function(e){
      var btn=e.target.closest("button");if(!btn)return;
      filters.querySelectorAll("button").forEach(function(b){b.classList.remove("active");});
      btn.classList.add("active");
      var cat=btn.dataset.cat;
      document.querySelectorAll(".grid [data-cat]").forEach(function(s){
        s.style.display=(cat==="all"||s.dataset.cat===cat)?"":"none";
      });
    });
  }

  /* order form */
  var form=document.querySelector("#order-form");
  if(form){
    var params=new URLSearchParams(location.search),wanted=params.get("product"),treat=params.get("treat");
    if(wanted&&form.elements.details){
      form.elements.details.value=(document.documentElement.lang==="ar"?"مهتم بـ: ":"Interested in: ")+wanted;
    }
    if(treat){
      form.querySelectorAll('input[name="treat"]').forEach(function(c){if(c.value.toLowerCase()===treat.toLowerCase())c.checked=true;});
    }
    form.addEventListener("submit",function(e){
      e.preventDefault();
      var isAr=document.documentElement.lang==="ar";
      var get=function(n){var el=form.elements[n];return el?el.value.trim():"";};
      var treats=Array.prototype.slice.call(form.querySelectorAll('input[name="treat"]:checked')).map(function(c){return c.value;}).join(", ");
      var L=isAr?{hi:"مرحباً Vanilla Concept! أودّ طلب تصميم خاص.",name:"الاسم",occ:"المناسبة",treat:"النوع",date:"التاريخ",guests:"عدد الضيوف",details:"التفاصيل",phone:"الهاتف"}
                :{hi:"Hi Vanilla Concept! I'd love to enquire about a custom order.",name:"Name",occ:"Occasion",treat:"Treat",date:"Date needed",guests:"Servings",details:"Details",phone:"Phone"};
      var lines=[L.hi,""],add=function(l,v){if(v)lines.push("• "+l+": "+v);};
      add(L.name,get("name"));add(L.phone,get("phone"));add(L.occ,get("occasion"));
      add(L.treat,treats);add(L.date,get("date"));add(L.guests,get("guests"));add(L.details,get("details"));
      window.open("https://wa.me/"+window.VC_WHATSAPP+"?text="+encodeURIComponent(lines.join("\n")),"_blank");
    });
  }

  /* newsletter */
  var news=document.querySelector("#news-form");
  if(news){
    news.addEventListener("submit",function(e){
      e.preventDefault();
      var isAr=document.documentElement.lang==="ar";
      var msg=news.querySelector(".news-msg");
      if(msg){msg.textContent=isAr?"شكراً لكم! أنتم الآن على قائمتنا الحلوة.":"Thank you — you're on the sweet list.";}
      news.querySelector("input").value="";
    });
  }
}

if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}
})();
