// Run in a real /tunnel page through a browser/CDP runner, at each viewport.
// Inject this module's source (remove the export keyword) and call checkTunnelLayout().
// Returns serializable assertions; the runner must fail when any assertion has !pass.
export function checkTunnelLayout() {
  const buttons = [...document.querySelectorAll('nav[aria-label="Seções do túnel"] button')];
  const sections = [...document.querySelectorAll('main section')];
  const main = document.querySelector('main');
  const compact = innerWidth < 900;
  const rect = (element) => element.getBoundingClientRect();
  const assertions = [];
  const check = (name, pass) => assertions.push({ name, pass });
  check('six sections and six destinations', sections.length === 6 && buttons.length === 6);
  const destinations = ['Início', 'Sobre', 'Stack', 'Experiência', 'Formação', 'Contato'];
  check('numeric selectors retain descriptive accessible names', buttons.every((button, index) =>
    button.getAttribute('aria-label') === `Ir para ${String(index + 1).padStart(2, '0')} ${destinations[index]}`));
  check('touch targets at least 44 x 44 CSS px', buttons.every((button) => {
    const { width, height } = rect(button);
    return width >= 44 && height >= 44;
  }));
  check('labels visible at >=900px, numbers only below', buttons.every((button) => {
    const label = button.lastElementChild;
    return (getComputedStyle(label).display === 'none') === compact;
  }));
  if (compact) {
    const rightEdge = Math.max(...buttons.map((button) => rect(button).right));
    check('content clears touch selector', sections.every((section) =>
      rect(section.firstElementChild).left >= rightEdge + 8));
    check('small-screen sections keep a 150vh minimum', sections.every((section) =>
      Math.abs(parseFloat(getComputedStyle(section).minHeight) - innerHeight * 1.5) <= 1));
  }
  check('no horizontal overflow inside panels', sections.every((section) => {
    const panel = section.firstElementChild;
    return panel.scrollWidth <= panel.clientWidth + 1;
  }));
  check('scroll area fits viewport', main.scrollWidth <= main.clientWidth + 1);
  const brand = rect(document.querySelector('header > div'));
  const back = rect(document.querySelector('header a'));
  check('brand does not cover selector touch targets', buttons.every((button) => {
    const target = rect(button);
    return brand.right <= target.left || brand.left >= target.right ||
      brand.bottom <= target.top || brand.top >= target.bottom;
  }));
  check('header link neither overlaps brand nor leaves viewport',
    (back.left >= brand.right + 8 || back.top >= brand.bottom + 4) &&
    back.right <= innerWidth && back.bottom <= innerHeight);
  return { viewport: { width: innerWidth, height: innerHeight }, assertions };
}
