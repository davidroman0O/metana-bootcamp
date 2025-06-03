import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

interface SlotMachineLeverProps {
  width?: number;
  height?: number;
  position?: 'left' | 'center' | 'right';
  cylinderOrientation?: 'left' | 'center' | 'right';
  cylinderLength?: number;
  cylinderDiameter?: number;
  stickDiameter?: number;
  stickLength?: number;
  ballSize?: number;
  showIndicator?: boolean;
  disabled?: boolean;
  onPullStart?: () => void;
  onPullComplete?: (result: any) => void;
  onStatusUpdate?: (message: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface SlotMachineLeverRef {
  setCallback: (callback: () => Promise<any>) => void;
  triggerPull: (speed?: number) => void;
}

interface LeverEngineOptions {
  position?: string;
  cylinderOrientation?: string;
  cylinderLength?: number;
  cylinderDiameter?: number;
  stickDiameter?: number;
  stickLength?: number;
  ballSize?: number;
  showIndicator?: boolean;
  disabled?: boolean;
  onPullStart?: () => void;
  onPullComplete?: (result: any) => void;
  onStatusUpdate?: (message: string) => void;
}

const SlotMachineLever = forwardRef<SlotMachineLeverRef, SlotMachineLeverProps>(({ 
  width = 300,
  height = 800,
  position = 'center',
  cylinderOrientation = 'center',
  cylinderLength = 1.0,
  cylinderDiameter = 1.0,
  stickDiameter = 1.0,
  stickLength = 1.0,
  ballSize = 1.0,
  showIndicator = true,
  disabled = false,
  onPullStart,
  onPullComplete,
  onStatusUpdate,
  className = '',
  style = {}
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leverInstanceRef = useRef<LeverEngine | null>(null);

  class LeverEngine {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    cylinderOrientation: string;
    cylinderLength: number;
    cylinderDiameter: number;
    stickDiameter: number;
    stickLength: number;
    ballSize: number;
    showIndicator: boolean;
    disabled: boolean;
    prevDisabled: boolean;
    leverBaseX: number;
    baseLeverBaseY: number;
    baseLeverLength: number;
    leverLength: number;
    leverBaseY: number;
    leverAngle: number;
    maxPullAngle: number;
    restAngle: number;
    minAngle: number;
    handleRadius: number;
    handleX: number;
    handleY: number;
    isDragging: boolean;
    isAnimating: boolean;
    isWaitingForCallback: boolean;
    dragOffset: { x: number; y: number };
    callbackFunction: (() => Promise<any>) | null;
    onPullStart: (() => void) | null;
    onPullComplete: ((result: any) => void) | null;
    onStatusUpdate: ((message: string) => void) | null;

    constructor(canvas: HTMLCanvasElement, options: LeverEngineOptions = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d')!;
      this.width = canvas.width;
      this.height = canvas.height;
      
      this.cylinderOrientation = options.cylinderOrientation || 'center';
      this.cylinderLength = options.cylinderLength || 1.0;
      this.cylinderDiameter = options.cylinderDiameter || 1.0;
      this.stickDiameter = options.stickDiameter || 1.0;
      this.stickLength = options.stickLength || 1.0;
      this.ballSize = options.ballSize || 1.0;
      this.showIndicator = options.showIndicator !== undefined ? options.showIndicator : true;
      this.disabled = options.disabled || false;
      this.prevDisabled = this.disabled;
      
      // Lever properties
      this.leverBaseX = this.calculateBaseX(options.position || 'center');
      this.baseLeverBaseY = 200;
      this.baseLeverLength = 120;
      
      this.leverLength = this.baseLeverLength * this.stickLength;
      this.leverBaseY = this.baseLeverBaseY + this.baseLeverLength * (this.stickLength - 1);
      
      this.leverAngle = 0;
      this.maxPullAngle = Math.PI;
      this.restAngle = 0;
      this.minAngle = 0;
      
      // Handle properties
      this.handleRadius = 25 * this.ballSize;
      this.handleX = 0;
      this.handleY = 0;
      this.updateHandlePosition();
      
      // Interaction state
      this.isDragging = false;
      this.isAnimating = false;
      this.isWaitingForCallback = false;
      this.dragOffset = { x: 0, y: 0 };
      
      // Callback function
      this.callbackFunction = null;
      
      // Event callbacks
      this.onPullStart = options.onPullStart || null;
      this.onPullComplete = options.onPullComplete || null;
      this.onStatusUpdate = options.onStatusUpdate || null;
      
      this.setupEventListeners();
      this.draw();
    }
    
    calculateBaseX(position: string): number {
      const margin = 60;
      switch(position.toLowerCase()) {
        case 'left': return margin;
        case 'right': return this.width - margin;
        case 'center':
        default: return this.width / 2;
      }
    }
    
    setCallback(callback: () => Promise<any>): void {
      this.callbackFunction = callback;
    }
    
    triggerProgrammaticPull(speed: number = 1.0): void {
      if (this.isAnimating || this.isWaitingForCallback || this.isDragging || this.disabled) {
        console.warn('Lever is busy or disabled, cannot trigger programmatic pull');
        return;
      }
      this.animatePullDown(speed);
    }
    
    updateHandlePosition(): void {
      this.handleX = this.leverBaseX;
      this.handleY = this.leverBaseY - Math.cos(this.leverAngle) * this.leverLength;
    }
    
    setupEventListeners(): void {
      this.handleStart = this.handleStart.bind(this);
      this.handleMove = this.handleMove.bind(this);
      this.handleEnd = this.handleEnd.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      
      this.canvas.addEventListener('mousedown', this.handleStart);
      this.canvas.addEventListener('mousemove', this.handleMouseMove);
      this.canvas.addEventListener('mouseup', this.handleEnd);
      
      this.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleStart(e.touches[0]);
      });
      this.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        this.handleMove(e.touches[0]);
      });
      this.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.handleEnd(e);
      });
    }
    
    getEventPos(event: MouseEvent | Touch | { clientX: number; clientY: number }): { x: number; y: number } {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }
    
    isPointInHandle(x: number, y: number): boolean {
      const distance = Math.sqrt(
        Math.pow(x - this.handleX, 2) + Math.pow(y - this.handleY, 2)
      );
      return distance <= this.handleRadius;
    }
    
    handleStart(event: MouseEvent | Touch): void {
      if (this.isAnimating || this.isWaitingForCallback || this.disabled) return;
      
      const pos = this.getEventPos(event);
      if (this.isPointInHandle(pos.x, pos.y)) {
        this.isDragging = true;
        this.dragOffset.x = pos.x - this.handleX;
        this.dragOffset.y = pos.y - this.handleY;
        this.canvas.style.cursor = 'grabbing';
      }
    }
    
    handleMove(event: MouseEvent | Touch): void {
      const pos = this.getEventPos(event);
      
      // Update cursor style regardless of dragging
      this.updateCursorStyle(pos.x, pos.y);
      
      if (!this.isDragging) return;
      
      const targetY = pos.y - this.dragOffset.y;
      const deltaY = targetY - this.leverBaseY;
      
      let angle = Math.acos(-deltaY / this.leverLength);
      
      if (isNaN(angle)) {
        if (deltaY < -this.leverLength) angle = 0;
        else if (deltaY > this.leverLength) angle = Math.PI;
      } else {
        angle = Math.max(0, Math.min(Math.PI, angle));
      }
      
      this.leverAngle = angle;
      this.updateHandlePosition();
      this.draw();
    }
    
    async handleEnd(event: MouseEvent | Touch | TouchEvent): Promise<void> {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      
      // Reset cursor style based on position
      const pos = this.getEventPos(
        event instanceof TouchEvent ? 
          (event.changedTouches[0] || { clientX: 0, clientY: 0 }) : 
          (event as MouseEvent | Touch)
      );
      this.updateCursorStyle(pos.x, pos.y);
      
      // Only trigger pull if lever is pulled down far enough AND not disabled
      if (this.leverAngle >= this.maxPullAngle * 0.9 && !this.disabled) {
        await this.triggerPull();
      } else {
        this.animateReturn();
      }
    }
    
    async triggerPull(): Promise<void> {
      if (this.onPullStart) {
        this.onPullStart();
      }
      
      this.isWaitingForCallback = true;
      this.updateStatus('Processing...');
      
      try {
        let result = null;
        if (this.callbackFunction) {
          result = await this.callbackFunction();
        }
        
        if (this.onPullComplete) {
          this.onPullComplete(result);
        }
        
        this.updateStatus(`Result: ${result || 'Complete!'}`);
      } catch (error) {
        console.error('Callback error:', error);
        this.updateStatus('Error occurred!');
      } finally {
        this.isWaitingForCallback = false;
        setTimeout(() => {
          this.animateReturn();
          this.updateStatus('Ready to pull!');
        }, 1000);
      }
    }
    
    animateReturn(): void {
      this.isAnimating = true;
      const startAngle = this.leverAngle;
      const startTime = Date.now();
      const duration = 500;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        this.leverAngle = startAngle + (this.restAngle - startAngle) * easeOut;
        this.updateHandlePosition();
        this.draw();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
        }
      };
      
      animate();
    }
    
    animatePullDown(speed: number = 1.0): void {
      this.isAnimating = true;
      const startAngle = this.leverAngle;
      const targetAngle = this.maxPullAngle;
      const startTime = Date.now();
      const duration = 800 / speed;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeInOut = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        this.leverAngle = startAngle + (targetAngle - startAngle) * easeInOut;
        this.updateHandlePosition();
        this.draw();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          this.triggerPull();
        }
      };
      
      animate();
    }
    
    draw(): void {
      if (this.prevDisabled !== this.disabled) {
        this.prevDisabled = this.disabled;
        if (!this.disabled) {
          this.leverAngle = this.restAngle;
          this.updateHandlePosition();
        }
      }
      
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawMachineBody();
      this.drawLeverArm();
      this.drawHandle();
      this.drawStatusIndicators();
    }
    
    drawMachineBody(): void {
      this.drawCylinder();
    }
    
    drawCylinder(): void {
      const baseCylinderWidth = 40;
      const cylinderHeight = 16 * this.cylinderDiameter;
      const baseX = this.leverBaseX;
      const baseY = this.leverBaseY;
      
      let leftExtension = 0;
      let rightExtension = 0;
      const additionalLength = (this.cylinderLength - 1.0) * baseCylinderWidth;
      
      switch(this.cylinderOrientation.toLowerCase()) {
        case 'left':
          rightExtension = additionalLength;
          break;
        case 'right':
          leftExtension = additionalLength;
          break;
        case 'center':
        default:
          leftExtension = additionalLength / 2;
          rightExtension = additionalLength / 2;
          break;
      }
      
      const cylinderWidth = baseCylinderWidth + leftExtension + rightExtension;
      const leftCapX = baseX - baseCylinderWidth/2 - leftExtension;
      const rightCapX = baseX + baseCylinderWidth/2 + rightExtension;
      
      let leftCapSize: number, rightCapSize: number, leftCapSkew: number, rightCapSkew: number;
      let drawLeftFirst = true;
      
      switch(this.cylinderOrientation.toLowerCase()) {
        case 'left':
          leftCapSize = 1.2;
          rightCapSize = 0.6;
          leftCapSkew = 0.8;
          rightCapSkew = 0.3;
          drawLeftFirst = false;
          break;
        case 'right':
          leftCapSize = 0.6;
          rightCapSize = 1.2;
          leftCapSkew = 0.3;
          rightCapSkew = 0.8;
          drawLeftFirst = true;
          break;
        case 'center':
        default:
          leftCapSize = 1.0;
          rightCapSize = 1.0;
          leftCapSkew = 0.6;
          rightCapSkew = 0.6;
          drawLeftFirst = true;
          break;
      }
      
      // Draw cylinder body
      const gradient = this.ctx.createLinearGradient(
        baseX, baseY - cylinderHeight/2, 
        baseX, baseY + cylinderHeight/2
      );
      gradient.addColorStop(0, '#555');
      gradient.addColorStop(0.5, '#777');
      gradient.addColorStop(1, '#444');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(
        leftCapX,
        baseY - cylinderHeight/2,
        cylinderWidth,
        cylinderHeight
      );
      
      // Draw caps with proper perspective
      if (drawLeftFirst) {
        if (this.cylinderOrientation.toLowerCase() === 'center') {
          const leftGradient = this.ctx.createRadialGradient(
            leftCapX + 3, baseY - 2, 0,
            leftCapX, baseY, cylinderHeight/2 * leftCapSize
          );
          leftGradient.addColorStop(0, '#999');
          leftGradient.addColorStop(1, '#555');
          this.ctx.fillStyle = leftGradient;
        } else {
          this.ctx.fillStyle = '#333';
        }
        this.ctx.beginPath();
        this.ctx.ellipse(
          leftCapX, baseY, 
          cylinderHeight/2 * leftCapSkew * leftCapSize, 
          cylinderHeight/2 * leftCapSize, 
          0, 0, Math.PI * 2
        );
        this.ctx.fill();
      } else {
        if (this.cylinderOrientation.toLowerCase() === 'center') {
          const rightGradient = this.ctx.createRadialGradient(
            rightCapX - 3, baseY - 2, 0,
            rightCapX, baseY, cylinderHeight/2 * rightCapSize
          );
          rightGradient.addColorStop(0, '#999');
          rightGradient.addColorStop(1, '#555');
          this.ctx.fillStyle = rightGradient;
        } else {
          this.ctx.fillStyle = '#333';
        }
        this.ctx.beginPath();
        this.ctx.ellipse(
          rightCapX, baseY, 
          cylinderHeight/2 * rightCapSkew * rightCapSize, 
          cylinderHeight/2 * rightCapSize, 
          0, 0, Math.PI * 2
        );
        this.ctx.fill();
      }
      
      // Draw front cap
      if (drawLeftFirst) {
        const frontGradient = this.ctx.createRadialGradient(
          rightCapX - 3, baseY - 2, 0,
          rightCapX, baseY, cylinderHeight/2 * rightCapSize
        );
        frontGradient.addColorStop(0, '#999');
        frontGradient.addColorStop(1, '#555');
        
        this.ctx.fillStyle = frontGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(
          rightCapX, baseY, 
          cylinderHeight/2 * rightCapSkew * rightCapSize, 
          cylinderHeight/2 * rightCapSize, 
          0, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#888';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        if (this.cylinderOrientation.toLowerCase() === 'center') {
          this.ctx.strokeStyle = '#888';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.ellipse(
            leftCapX, baseY, 
            cylinderHeight/2 * leftCapSkew * leftCapSize, 
            cylinderHeight/2 * leftCapSize, 
            0, 0, Math.PI * 2
          );
          this.ctx.stroke();
        }
      } else {
        const frontGradient = this.ctx.createRadialGradient(
          leftCapX + 3, baseY - 2, 0,
          leftCapX, baseY, cylinderHeight/2 * leftCapSize
        );
        frontGradient.addColorStop(0, '#999');
        frontGradient.addColorStop(1, '#555');
        
        this.ctx.fillStyle = frontGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(
          leftCapX, baseY, 
          cylinderHeight/2 * leftCapSkew * leftCapSize, 
          cylinderHeight/2 * leftCapSize, 
          0, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#888';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        if (this.cylinderOrientation.toLowerCase() === 'center') {
          this.ctx.strokeStyle = '#888';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.ellipse(
            rightCapX, baseY, 
            cylinderHeight/2 * rightCapSkew * rightCapSize, 
            cylinderHeight/2 * rightCapSize, 
            0, 0, Math.PI * 2
          );
          this.ctx.stroke();
        }
      }
      
      // Draw pivot hole
      this.ctx.fillStyle = '#222';
      this.ctx.beginPath();
      this.ctx.ellipse(
        baseX, baseY, 
        4 * this.cylinderDiameter, 
        4 * this.cylinderDiameter, 
        0, 0, Math.PI * 2
      );
      this.ctx.fill();
    }
    
    drawLeverArm(): void {
      this.ctx.strokeStyle = '#888';
      this.ctx.lineWidth = 8 * this.stickDiameter;
      this.ctx.lineCap = 'round';
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.leverBaseX, this.leverBaseY);
      this.ctx.lineTo(this.handleX, this.handleY);
      this.ctx.stroke();
      
      this.ctx.strokeStyle = '#aaa';
      this.ctx.lineWidth = 2 * this.stickDiameter;
      this.ctx.beginPath();
      this.ctx.moveTo(this.leverBaseX - 2, this.leverBaseY);
      this.ctx.lineTo(this.handleX - 2, this.handleY);
      this.ctx.stroke();
    }
    
    drawHandle(): void {
      // Handle shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.beginPath();
      this.ctx.arc(this.handleX + 2, this.handleY + 2, this.handleRadius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Handle gradient
      const handleGradient = this.ctx.createRadialGradient(
        this.handleX - 8, this.handleY - 8, 0,
        this.handleX, this.handleY, this.handleRadius
      );
      
      if (this.disabled) {
        handleGradient.addColorStop(0, '#aaaaaa');
        handleGradient.addColorStop(1, '#777777');
      } else if (this.isWaitingForCallback) {
        handleGradient.addColorStop(0, '#ffeb3b');
        handleGradient.addColorStop(1, '#ff9800');
      } else if (this.isDragging) {
        handleGradient.addColorStop(0, '#ff5722');
        handleGradient.addColorStop(1, '#d32f2f');
      } else {
        handleGradient.addColorStop(0, '#ffd700');
        handleGradient.addColorStop(1, '#ffa000');
      }
      
      this.ctx.fillStyle = handleGradient;
      this.ctx.beginPath();
      this.ctx.arc(this.handleX, this.handleY, this.handleRadius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Handle highlight (dimmed when disabled)
      this.ctx.fillStyle = this.disabled 
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(255, 255, 255, 0.4)';
      this.ctx.beginPath();
      this.ctx.arc(this.handleX - 6, this.handleY - 6, 8, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Add "disabled" symbol when disabled
      if (this.disabled) {
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        
        const radius = this.handleRadius * 0.7;
        this.ctx.moveTo(this.handleX - radius, this.handleY - radius);
        this.ctx.lineTo(this.handleX + radius, this.handleY + radius);
        this.ctx.stroke();
      }
    }
    
    drawStatusIndicators(): void {
      if (!this.showIndicator) return;
      
      const progress = this.leverAngle / this.maxPullAngle;
      const barWidth = 200;
      const barHeight = 10;
      const barX = (this.width - barWidth) / 2;
      const barY = this.height - 40;
      
      // Background
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Progress
      this.ctx.fillStyle = progress >= 0.9 ? '#4caf50' : '#ffd700';
      this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
      
      // Pull threshold indicator
      const thresholdX = barX + barWidth * 0.9;
      this.ctx.fillStyle = '#ff5722';
      this.ctx.fillRect(thresholdX - 1, barY - 5, 2, barHeight + 10);
    }
    
    updateStatus(message: string): void {
      if (this.onStatusUpdate) {
        this.onStatusUpdate(message);
      }
    }
    
    setDisabled(disabled: boolean): void {
      if (this.disabled && !disabled) {
        this.leverAngle = this.restAngle;
        this.updateHandlePosition();
      }
      
      this.disabled = disabled;
      this.prevDisabled = disabled;
      this.draw();
    }
    
    destroy(): void {
      this.canvas.removeEventListener('mousedown', this.handleStart);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mouseup', this.handleEnd);
    }
    
    // Fix the updateCursorStyle method to only show not-allowed on the ball
    updateCursorStyle(x: number, y: number): void {
      // First check if we're hovering over the handle
      if (this.isPointInHandle(x, y)) {
        // Handle cursor styles based on state
        if (this.disabled) {
          this.canvas.style.cursor = 'not-allowed';
        } else if (this.isDragging) {
          this.canvas.style.cursor = 'grabbing';
        } else {
          this.canvas.style.cursor = 'grab';
        }
      } else {
        // Not over the handle, always use default cursor
        this.canvas.style.cursor = 'default';
      }
    }
    
    // Add a separate handler for mouse movement (cursor updates)
    handleMouseMove(event: MouseEvent): void {
      const pos = this.getEventPos(event);
      this.updateCursorStyle(pos.x, pos.y);
      
      // Still process dragging
      if (this.isDragging) {
        this.handleMove(event);
      }
    }
  }

  useEffect(() => {
    if (canvasRef.current) {
      // Clean up previous instance
      if (leverInstanceRef.current) {
        leverInstanceRef.current.destroy();
      }
      
      // Create new lever instance
      leverInstanceRef.current = new LeverEngine(canvasRef.current, {
        position,
        cylinderOrientation,
        cylinderLength,
        cylinderDiameter,
        stickDiameter,
        stickLength,
        ballSize,
        showIndicator,
        disabled,
        onPullStart,
        onPullComplete,
        onStatusUpdate
      });
    }
    
    return () => {
      if (leverInstanceRef.current) {
        leverInstanceRef.current.destroy();
      }
    };
  }, [position, cylinderOrientation, cylinderLength, cylinderDiameter, stickDiameter, stickLength, ballSize, showIndicator, onPullStart, onPullComplete, onStatusUpdate]);

  useEffect(() => {
    if (leverInstanceRef.current) {
      leverInstanceRef.current.setDisabled(disabled);
    }
  }, [disabled]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    setCallback: (callback: () => Promise<any>) => {
      if (leverInstanceRef.current) {
        leverInstanceRef.current.setCallback(callback);
      }
    },
    triggerPull: (speed: number = 1.0) => {
      if (leverInstanceRef.current) {
        leverInstanceRef.current.triggerProgrammaticPull(speed);
      }
    }
  }));

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        ...style,
        cursor: 'default' // Default cursor for the canvas
      }}
    />
  );
});

SlotMachineLever.displayName = 'SlotMachineLever';

export default SlotMachineLever; 