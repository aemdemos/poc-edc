export default function decorate(block) {
  const children = [...block.children];
  if (children.length >= 2) {
    children[0].classList.add('case-study-main');
    children[1].classList.add('case-study-rail');
  }
}
