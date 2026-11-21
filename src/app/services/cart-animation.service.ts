import {Injectable} from '@angular/core';

@Injectable({providedIn: 'root'})
export class CartAnimationService {
  private readonly cartSelector = '[data-cart-animation-target]';

  flyToCart(source: HTMLElement, imageUrl: string): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cart = document.querySelector<HTMLElement>(this.cartSelector);
    if (!cart) return;

    const sourceBounds = source.getBoundingClientRect();
    const cartBounds = cart.getBoundingClientRect();
    const size = Math.max(36, Math.min(72, sourceBounds.width));
    const item = document.createElement('img');
    item.src = imageUrl;
    item.alt = '';
    item.setAttribute('aria-hidden', 'true');
    Object.assign(item.style, {
      position: 'fixed', zIndex: '9999',
      left: `${sourceBounds.left + sourceBounds.width / 2 - size / 2}px`,
      top: `${sourceBounds.top + sourceBounds.height / 2 - size / 2}px`,
      width: `${size}px`, height: `${size}px`, objectFit: 'contain', padding: '5px',
      border: '1px solid #dce3dc', borderRadius: '50%', background: '#fff',
      boxShadow: '0 8px 20px rgb(36 61 53 / 22%)', pointerEvents: 'none',
      willChange: 'transform, opacity',
    });
    document.body.appendChild(item);

    const destinationX = cartBounds.left + cartBounds.width / 2 - sourceBounds.left - sourceBounds.width / 2;
    const destinationY = cartBounds.top + cartBounds.height / 2 - sourceBounds.top - sourceBounds.height / 2;
    const animation = item.animate([
      {transform: 'translate(0, 0) scale(1)', opacity: 1},
      {transform: `translate(${destinationX * .65}px, ${destinationY * .35 - 48}px) scale(.8)`, opacity: .9, offset: .55},
      {transform: `translate(${destinationX}px, ${destinationY}px) scale(.18)`, opacity: .2},
    ], {duration: 650, easing: 'cubic-bezier(.2, .8, .25, 1)'});

    animation.onfinish = () => {
      item.remove();
      cart.animate([
        {transform: 'scale(1)'},
        {transform: 'scale(1.14)', offset: .45},
        {transform: 'scale(1)'},
      ], {duration: 280, easing: 'ease-out'});
    };
  }
}
