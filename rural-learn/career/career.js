class CareerPathVisualization {
    constructor() {
        this.canvas = document.getElementById('careerCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.careerInfo = document.getElementById('careerInfo');
        this.loading = document.getElementById('loading');
        
        this.careerData = null;
        this.hoveredCareer = null;
        this.draggedCareer = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        this.init();
    }
    
    async init() {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const crId = urlParams.get('cr');
        const chapterName = urlParams.get('ch');
        
        if (!crId) {
            this.showError('No career path ID provided');
            return;
        }
        
        // Update title
        if (chapterName) {
            document.getElementById('careerTitle').textContent = `${decodeURIComponent(chapterName)} - Career Path`;
        }
        
        // Load career data
        await this.loadCareerData(crId);
        
        // Setup canvas
        this.setupCanvas();
        
        // Add event listeners
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        window.addEventListener('resize', () => this.setupCanvas());
    }
    
    async loadCareerData(crId) {
        try {
            const response = await fetch(`https://tawf54kc575lndv6wj2woqq5uy0fbfez.lambda-url.ap-south-1.on.aws/?action=getCareerPath&crId=${crId}`);
            
            if (!response.ok) {
                throw new Error('Career path not found');
            }
            
            const data = await response.json();
            
            // Extract the career data (it's nested under the chapter ID)
            const chapterKey = Object.keys(data)[0];
            this.careerData = data[chapterKey];
            
            console.log('Loaded career data:', this.careerData);
            
            // Hide loading and show canvas
            this.loading.style.display = 'none';
            this.canvas.style.display = 'block';
            
            // Draw the career path
            this.drawCareerPath();
            
        } catch (error) {
            console.error('Error loading career data:', error);
            this.showError('Failed to load career path data');
        }
    }
    
    setupCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas size with device pixel ratio for crisp rendering
        this.canvas.width = (rect.width - 32) * dpr;
        this.canvas.height = (rect.height - 32) * dpr;
        this.canvas.style.width = (rect.width - 32) + 'px';
        this.canvas.style.height = (rect.height - 32) + 'px';
        
        this.ctx.scale(dpr, dpr);
        
        // Initialize pan to center if first time
        if (this.panX === 0 && this.panY === 0) {
            this.panX = (rect.width - 32) / 2 - 400;
            this.panY = (rect.height - 32) / 2 - 300;
        }
        
        // Redraw if data is loaded
        if (this.careerData) {
            this.drawCareerPath();
        }
    }
    
    drawCareerPath() {
        if (!this.careerData) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for transformations
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // Draw connections from center to careers
        this.drawConnections();
        
        // Draw center node
        this.drawCenterNode();
        
        // Draw career nodes
        this.drawCareerNodes();
        
        // Restore context
        this.ctx.restore();
    }
    
    drawConnections() {
        const center = this.careerData.center;
        
        this.careerData.careers.forEach(career => {
            // Create gradient for connection lines
            const gradient = this.ctx.createLinearGradient(center.x, center.y, career.x, career.y);
            gradient.addColorStop(0, '#4a90e2');
            gradient.addColorStop(1, '#333');
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.lineCap = 'round';
            
            this.ctx.beginPath();
            this.ctx.moveTo(center.x, center.y);
            this.ctx.lineTo(career.x, career.y);
            this.ctx.stroke();
        });
    }
    
    drawCenterNode() {
        const center = this.careerData.center;
        const radius = 40;
        
        // Draw shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // Draw circle with gradient
        const gradient = this.ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
        gradient.addColorStop(0, '#4a90e2');
        gradient.addColorStop(1, '#357abd');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        
        // Draw border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw text with proper wrapping
        this.drawWrappedText(center.title, center.x, center.y, radius * 1.5, 12, 'white');
    }
    
    drawCareerNodes() {
        this.careerData.careers.forEach(career => {
            const isHovered = this.hoveredCareer === career.id;
            const radius = 25;
            
            // Draw shadow for hovered state
            if (isHovered) {
                this.ctx.shadowColor = 'rgba(76, 175, 80, 0.4)';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
            }
            
            // Draw circle with gradient
            const gradient = this.ctx.createRadialGradient(career.x, career.y, 0, career.x, career.y, radius);
            if (isHovered) {
                gradient.addColorStop(0, '#4caf50');
                gradient.addColorStop(1, '#388e3c');
            } else {
                gradient.addColorStop(0, '#666');
                gradient.addColorStop(1, '#444');
            }
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(career.x, career.y, radius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            
            // Draw border
            this.ctx.strokeStyle = isHovered ? '#4caf50' : '#888';
            this.ctx.lineWidth = isHovered ? 2 : 1;
            this.ctx.stroke();
            
            // Draw text with proper wrapping
            this.drawWrappedText(career.title, career.x, career.y, radius * 1.8, 9, 'white');
        });
    }
    
    drawWrappedText(text, x, y, maxWidth, fontSize, color) {
        this.ctx.fillStyle = color;
        this.ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        if (this.ctx.measureText(text).width <= maxWidth) {
            this.ctx.fillText(text, x, y);
            return;
        }
        
        const words = text.split(' ');
        if (words.length > 1) {
            const mid = Math.ceil(words.length / 2);
            const line1 = words.slice(0, mid).join(' ');
            const line2 = words.slice(mid).join(' ');
            
            this.ctx.fillText(line1, x, y - fontSize/2);
            this.ctx.fillText(line2, x, y + fontSize/2);
        } else {
            const truncated = text.length > 12 ? text.substring(0, 10) + '...' : text;
            this.ctx.fillText(truncated, x, y);
        }
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.panX) / this.zoom,
            y: (e.clientY - rect.top - this.panY) / this.zoom
        };
    }
    
    getCareerAt(x, y) {
        return this.careerData.careers.find(career => {
            const distance = Math.sqrt((x - career.x) ** 2 + (y - career.y) ** 2);
            return distance <= 25;
        });
    }
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        const career = this.getCareerAt(pos.x, pos.y);
        
        if (career) {
            this.draggedCareer = career;
            this.isDragging = true;
            this.canvas.style.cursor = 'grabbing';
        } else {
            this.isPanning = true;
            this.canvas.style.cursor = 'grabbing';
        }
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }
    
    handleMouseMove(e) {
        if (this.isDragging && this.draggedCareer) {
            const pos = this.getMousePos(e);
            this.draggedCareer.x = pos.x;
            this.draggedCareer.y = pos.y;
            this.drawCareerPath();
            return;
        }
        
        if (this.isPanning) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            this.panX += deltaX;
            this.panY += deltaY;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.drawCareerPath();
            return;
        }
        
        const pos = this.getMousePos(e);
        const hoveredCareer = this.getCareerAt(pos.x, pos.y);
        
        if (hoveredCareer) {
            if (this.hoveredCareer !== hoveredCareer.id) {
                this.hoveredCareer = hoveredCareer.id;
                this.showCareerInfo(hoveredCareer, e.clientX, e.clientY);
                this.drawCareerPath();
                this.canvas.style.cursor = 'grab';
            }
        } else {
            if (this.hoveredCareer !== null) {
                this.hoveredCareer = null;
                this.hideCareerInfo();
                this.drawCareerPath();
                this.canvas.style.cursor = 'default';
            }
        }
    }
    
    handleMouseUp(e) {
        this.isDragging = false;
        this.isPanning = false;
        this.draggedCareer = null;
        this.canvas.style.cursor = 'default';
    }
    
    handleMouseLeave() {
        this.isDragging = false;
        this.isPanning = false;
        this.draggedCareer = null;
        this.hoveredCareer = null;
        this.hideCareerInfo();
        this.canvas.style.cursor = 'default';
        this.drawCareerPath();
    }
    
    handleWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.5, Math.min(3, this.zoom * zoomFactor));
        
        // Zoom towards mouse position
        this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
        this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
        this.zoom = newZoom;
        
        this.drawCareerPath();
    }
    
    showCareerInfo(career, x, y) {
        const info = this.careerInfo;
        
        info.innerHTML = `
            <h3>${career.title}</h3>
            <div class="salary">${career.salary}</div>
            <div class="education">${career.education}</div>
            <div class="description">${career.description}</div>
        `;
        
        // Position the info box
        info.style.left = (x + 10) + 'px';
        info.style.top = (y - 10) + 'px';
        info.style.display = 'block';
        
        // Adjust position if it goes off screen
        const rect = info.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            info.style.left = (x - rect.width - 10) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            info.style.top = (y - rect.height + 10) + 'px';
        }
    }
    
    hideCareerInfo() {
        this.careerInfo.style.display = 'none';
    }
    
    showError(message) {
        this.loading.innerHTML = `
            <div style="color: #dc3545; text-align: center;">
                <h3>Error</h3>
                <p>${message}</p>
                <a href="../index.html" style="color: #667eea; text-decoration: none;">← Back to Dashboard</a>
            </div>
        `;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CareerPathVisualization();
});