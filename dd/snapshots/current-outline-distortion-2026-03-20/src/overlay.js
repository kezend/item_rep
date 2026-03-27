function setTranslate(element, x, y) {
  element.dataset.x = String(x);
  element.dataset.y = String(y);
  element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

export class OverlayLayer {
  constructor(root) {
    this.root = root;
    this.metaPrimary = root.querySelector("#overlay-meta-primary-view");
    this.metaSecondary = root.querySelector("#overlay-meta-secondary-view");
    this.barcode = root.querySelector("#barcode-svg");
    this.qr = root.querySelector("#qr-view");
    this.items = [...root.querySelectorAll("[data-overlay-item], #barcode-svg, #qr-view")];
    this.dragState = null;

    setTranslate(this.metaPrimary.parentElement, 0, 0);
    setTranslate(this.barcode, 0, 0);
    setTranslate(this.qr, 0, 0);
    this.enableDragging();
  }

  enableDragging() {
    this.root.addEventListener("pointerdown", (event) => {
      const target = event.target.closest(".overlay-item");

      if (!target) {
        return;
      }

      this.dragState = {
        target,
        startX: event.clientX,
        startY: event.clientY,
        baseX: Number(target.dataset.x || 0),
        baseY: Number(target.dataset.y || 0)
      };

      target.setPointerCapture(event.pointerId);
    });

    this.root.addEventListener("pointermove", (event) => {
      if (!this.dragState) {
        return;
      }

      const nextX = this.dragState.baseX + (event.clientX - this.dragState.startX);
      const nextY = this.dragState.baseY + (event.clientY - this.dragState.startY);
      setTranslate(this.dragState.target, nextX, nextY);
    });

    const clearDrag = () => {
      this.dragState = null;
    };

    this.root.addEventListener("pointerup", clearDrag);
    this.root.addEventListener("pointercancel", clearDrag);
  }

  update(state) {
    this.root.style.display = state.layers.overlay.visible ? "block" : "none";
    this.root.style.opacity = String(state.layers.overlay.opacity);
    this.root.style.transform = `translate3d(0, 0, ${state.layers.overlay.z}px)`;

    this.metaPrimary.parentElement.style.display = state.overlay.metaEnabled ? "block" : "none";
    this.metaPrimary.textContent = state.overlay.metaPrimary;
    this.metaSecondary.textContent = state.overlay.metaSecondary;

    this.barcode.style.display = state.overlay.barcodeEnabled ? "block" : "none";
    this.qr.style.display = state.overlay.qrEnabled ? "grid" : "none";
    this.barcode.innerHTML = "";
    this.qr.innerHTML = "";

    if (state.overlay.barcodeEnabled && window.JsBarcode) {
      window.JsBarcode(this.barcode, state.overlay.barcodeValue || "TYPE-SCAN", {
        displayValue: false,
        lineColor: "#000000",
        background: "transparent",
        height: 54,
        width: 1.7,
        margin: 0
      });
    } else if (state.overlay.barcodeEnabled) {
      this.barcode.innerHTML = `
        <rect x="0" y="0" width="100%" height="100%" fill="white"></rect>
        <text x="50%" y="50%" fill="black" font-size="10" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">
          BARCODE
        </text>
      `;
    }

    if (state.overlay.qrEnabled && window.qrcode) {
      const qr = window.qrcode(0, "M");
      qr.addData(state.overlay.qrValue || "https://example.com");
      qr.make();
      this.qr.innerHTML = qr.createSvgTag(4, 0);
    } else if (state.overlay.qrEnabled) {
      this.qr.innerHTML = `<div style="font:600 10px/1 sans-serif; color:#000; letter-spacing:0.16em;">QR</div>`;
    }
  }
}
