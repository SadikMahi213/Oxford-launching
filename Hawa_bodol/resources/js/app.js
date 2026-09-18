import './bootstrap';
import Alpine from 'alpinejs';
window.Alpine = Alpine;
Alpine.start();

// reveal on scroll
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('active'); });
},{threshold:0.12});
document.addEventListener('DOMContentLoaded',()=>{ document.querySelectorAll('.reveal').forEach(el=>observer.observe(el)); });
