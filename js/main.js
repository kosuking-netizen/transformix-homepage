const toggle = document.getElementById('lang-toggle');
let isEN = false;

toggle.addEventListener('click', () => {
  isEN = !isEN;
  toggle.textContent = isEN ? 'JP' : 'EN';
  document.documentElement.lang = isEN ? 'en' : 'ja';

  document.querySelectorAll('[data-jp][data-en]').forEach(el => {
    el.textContent = isEN ? el.dataset.en : el.dataset.jp;
  });
});
