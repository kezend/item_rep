function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(current, target, amount) {
  return current + (target - current) * amount;
}

function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function averageLandmark(landmarks) {
  const center = { x: 0, y: 0 };

  for (const item of landmarks) {
    center.x += item.x;
    center.y += item.y;
  }

  center.x /= landmarks.length || 1;
  center.y /= landmarks.length || 1;
  return center;
}

function isFingerExtended(hand, tipIndex, pipIndex, mcpIndex) {
  return hand[tipIndex].y < hand[pipIndex].y && hand[pipIndex].y < hand[mcpIndex].y;
}

function isOpenPalmGesture(hand) {
  if (!hand) {
    return false;
  }

  const palmCenter = averageLandmark([hand[0], hand[5], hand[9], hand[13], hand[17]]);
  const thumbSpread = distance2D(hand[4], palmCenter);
  const indexOpen = isFingerExtended(hand, 8, 6, 5);
  const middleOpen = isFingerExtended(hand, 12, 10, 9);
  const ringOpen = isFingerExtended(hand, 16, 14, 13);
  const pinkyOpen = isFingerExtended(hand, 20, 18, 17);

  return thumbSpread > 0.18 && indexOpen && middleOpen && ringOpen && pinkyOpen;
}

export class HandControlManager {
  constructor({ video, overlay, onUpdate, onStatus }) {
    this.video = video;
    this.overlay = overlay;
    this.onUpdate = onUpdate;
    this.onStatus = onStatus;
    this.stream = null;
    this.hands = null;
    this.running = false;
    this.loopHandle = 0;
    this.lastVideoTime = -1;
    this.brandNextReady = true;
    this.state = {
      pinch: 0,
      rotationX: 0,
      rotationY: 0,
      brandVariation: 0,
      brandSwitchX: 0,
      brandNextPulse: 0
    };
  }

  setStatus(message) {
    if (this.onStatus) {
      this.onStatus(message);
    }
  }

  async waitForMediaPipe() {
    const timeoutAt = performance.now() + 8000;

    while (performance.now() < timeoutAt) {
      if (window.Hands) {
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    throw new Error("MediaPipe Hands failed to load.");
  }

  async start() {
    if (this.running) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Webcam access is not available in this browser.");
    }

    this.setStatus("Loading hand tracking...");
    await this.waitForMediaPipe();

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 960 },
        height: { ideal: 540 }
      },
      audio: false
    });

    this.video.srcObject = this.stream;
    await this.video.play();

    this.hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.55
    });

    this.hands.onResults((results) => {
      this.handleResults(results);
    });

    this.running = true;
    this.lastVideoTime = -1;
    this.setStatus("Hand control active.");
    this.tick();
  }

  async tick() {
    if (!this.running) {
      return;
    }

    try {
      if (this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.video.currentTime;
        await this.hands.send({ image: this.video });
      }
    } catch (error) {
      console.error(error);
      this.setStatus("Hand tracking interrupted.");
    }

    this.loopHandle = window.requestAnimationFrame(() => this.tick());
  }

  draw(results) {
    const context = this.overlay.getContext("2d");

    if (!context) {
      return;
    }

    const width = this.video.videoWidth || 640;
    const height = this.video.videoHeight || 360;

    if (this.overlay.width !== width || this.overlay.height !== height) {
      this.overlay.width = width;
      this.overlay.height = height;
    }

    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width, 0);
    context.scale(-1, 1);

    const hands = results.multiHandLandmarks || [];

    for (let handIndex = 0; handIndex < hands.length; handIndex += 1) {
      const landmarks = hands[handIndex];
      const alpha = handIndex === 0 ? 0.9 : 0.58;

      context.strokeStyle = `rgba(0,255,102,${alpha})`;
      context.fillStyle = `rgba(255,255,255,${alpha})`;
      context.lineWidth = 1.2;

      for (const point of landmarks) {
        context.beginPath();
        context.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
        context.fill();
      }

      const thumb = landmarks[4];
      const index = landmarks[8];
      context.beginPath();
      context.moveTo(thumb.x * width, thumb.y * height);
      context.lineTo(index.x * width, index.y * height);
      context.stroke();
    }

    context.restore();
  }

  handleResults(results) {
    this.draw(results);

    const hands = results.multiHandLandmarks || [];

    if (!hands.length) {
      this.state.pinch = lerp(this.state.pinch, 0, 0.18);
      this.state.rotationX = lerp(this.state.rotationX, 0, 0.18);
      this.state.rotationY = lerp(this.state.rotationY, 0, 0.18);
      this.state.brandVariation = lerp(this.state.brandVariation, 0, 0.18);
      this.state.brandSwitchX = lerp(this.state.brandSwitchX, 0, 0.18);
      this.state.brandNextPulse = 0;
      this.brandNextReady = true;
      this.onUpdate?.({
        enabled: true,
        pinch: this.state.pinch,
        rotationX: this.state.rotationX,
        rotationY: this.state.rotationY,
        brandVariation: this.state.brandVariation,
        brandSwitchX: this.state.brandSwitchX,
        brandNextPulse: 0,
        handsDetected: 0
      });
      this.setStatus("Show one or two hands to control the scene.");
      return;
    }

    const primary = hands[0];
    const thumbTip = primary[4];
    const indexTip = primary[8];
    const pinchDistance = distance2D(thumbTip, indexTip);
    const pinchMin = 0.018;
    const pinchMax = 0.22;
    const pinchNormalized = clamp((pinchDistance - pinchMin) / (pinchMax - pinchMin), 0, 1);
    const pinchTarget = pinchNormalized * 2 - 1;
    this.state.pinch = lerp(this.state.pinch, pinchTarget, 0.18);

    let rotationTargetX = 0;
    let rotationTargetY = 0;

    if (hands[1]) {
      const center = averageLandmark(hands[1]);
      rotationTargetY = clamp((center.x - 0.5) * 2.2, -1, 1);
      rotationTargetX = clamp((0.5 - center.y) * 1.8, -1, 1);
      this.setStatus("Two hands detected. Pinch with one hand, rotate with the second.");
    } else {
      this.setStatus("One hand detected. Use pinch to compress or expand.");
    }

    this.state.rotationX = lerp(this.state.rotationX, rotationTargetX, 0.16);
    this.state.rotationY = lerp(this.state.rotationY, rotationTargetY, 0.16);

    const handedness = results.multiHandedness || [];
    let leftHand = null;
    let rightHand = null;

    for (let index = 0; index < hands.length; index += 1) {
      const label = handedness[index]?.label;

      if (label === "Left") {
        leftHand = hands[index];
      } else if (label === "Right") {
        rightHand = hands[index];
      }
    }

    if (!leftHand || !rightHand) {
      const sorted = [...hands].sort((a, b) => averageLandmark(a).x - averageLandmark(b).x);
      leftHand ||= sorted[0] || null;
      rightHand ||= sorted[sorted.length - 1] || null;
    }

    if (rightHand) {
      const rightPinchDistance = distance2D(rightHand[4], rightHand[8]);
      const rightNormalized = clamp((rightPinchDistance - pinchMin) / (pinchMax - pinchMin), 0, 1);
      this.state.brandVariation = lerp(this.state.brandVariation, rightNormalized, 0.18);
    } else {
      this.state.brandVariation = lerp(this.state.brandVariation, 0, 0.18);
    }

    if (leftHand) {
      const leftCenter = averageLandmark(leftHand);
      this.state.brandSwitchX = lerp(this.state.brandSwitchX, clamp((leftCenter.x - 0.5) * 2.1, -1, 1), 0.18);
    } else {
      this.state.brandSwitchX = lerp(this.state.brandSwitchX, 0, 0.18);
    }

    const leftOpenPalm = isOpenPalmGesture(leftHand);
    let brandNextPulse = 0;

    if (leftOpenPalm && this.brandNextReady) {
      brandNextPulse = 1;
      this.brandNextReady = false;
    } else if (!leftOpenPalm) {
      this.brandNextReady = true;
    }

    this.state.brandNextPulse = brandNextPulse;

    this.onUpdate?.({
      enabled: true,
      pinch: clamp(this.state.pinch, -1, 1),
      rotationX: clamp(this.state.rotationX, -1, 1),
      rotationY: clamp(this.state.rotationY, -1, 1),
      brandVariation: clamp(this.state.brandVariation, 0, 1),
      brandSwitchX: clamp(this.state.brandSwitchX, -1, 1),
      brandNextPulse,
      handsDetected: hands.length
    });
  }

  stop() {
    this.running = false;
    window.cancelAnimationFrame(this.loopHandle);
    this.loopHandle = 0;

    if (this.hands?.close) {
      this.hands.close();
    }

    this.hands = null;

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
    }

    this.stream = null;
    this.video.pause();
    this.video.srcObject = null;

    const context = this.overlay.getContext("2d");

    if (context) {
      context.clearRect(0, 0, this.overlay.width, this.overlay.height);
    }

    this.state.pinch = 0;
    this.state.rotationX = 0;
    this.state.rotationY = 0;
    this.state.brandVariation = 0;
    this.state.brandSwitchX = 0;
    this.state.brandNextPulse = 0;
    this.brandNextReady = true;
    this.onUpdate?.({
      enabled: false,
      pinch: 0,
      rotationX: 0,
      rotationY: 0,
      brandVariation: 0,
      brandSwitchX: 0,
      brandNextPulse: 0,
      handsDetected: 0
    });
    this.setStatus("Hand control stopped.");
  }
}
