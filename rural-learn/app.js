document.addEventListener('alpine:init', () => {
    Alpine.data('sidebarManager', () => ({
        leftSidebarOpen: window.innerWidth > 1024,
        rightSidebarOpen: window.innerWidth > 1024,
        isMobile: window.innerWidth <= 1024,
        searchQuery: '',
        showShimmer: true,
        selectedChapter: null,
        contentLoading: false,
        chapterContent: null,
        units: [],

        init() {
            this.checkMobile();
            this.setDefaultState();
            
            // Wait for Firebase auth to be ready
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    console.log('User authenticated, loading subjects');
                    this.loadSubjects();
                }
            });
            
            window.addEventListener('resize', () => {
                const wasMobile = this.isMobile;
                this.checkMobile();
                if (wasMobile !== this.isMobile) {
                    this.setDefaultState();
                }
            });
        },
        
        async loadSubjects() {
            try {
                const user = firebase.auth().currentUser;
                if (!user) {
                    console.log('No user found, cannot load subjects');
                    this.showShimmer = false;
                    return;
                }
                
                console.log('Loading subjects for user:', user.email);
                
                const response = await fetch('https://tawf54kc575lndv6wj2woqq5uy0fbfez.lambda-url.ap-south-1.on.aws/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'getStudentSubjects',
                        studentEmail: user.email
                    })
                });
                
                console.log('Response status:', response.status);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Subjects response:', result);
                    const subjects = result.subjects || [];
                    
                    console.log('Found subjects:', subjects.length);
                    
                    // Process subjects sequentially to handle async emoji generation
                    this.units = [];
                    for (const subject of subjects) {
                        console.log('Processing subject:', subject.name);
                        const emoji = await this.generateEmoji(subject.name);
                        this.units.push({
                            name: subject.name,
                            emoji: emoji,
                            active: false,
                            chId: subject.subjectId,
                            ragSummary: subject.ragSummary,
                            files: subject.files,
                            hasQuiz: subject.hasQuiz || false,
                            hasFlashcards: subject.hasFlashcards || false,
                            hasCareerPath: subject.hasCareerPath || false
                        });
                    }
                    
                    console.log('Final units array:', this.units);
                    this.loadSelectedChapter();
                } else {
                    const errorText = await response.text();
                    console.error('Failed to load subjects:', response.status, errorText);
                }
            } catch (error) {
                console.error('Error loading subjects:', error);
            } finally {
                this.showShimmer = false;
            }
        },
        
        async generateEmoji(subjectName) {
            try {
                const response = await fetch('https://tawf54kc575lndv6wj2woqq5uy0fbfez.lambda-url.ap-south-1.on.aws/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'generateEmoji',
                        subjectName: subjectName
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    return result.emoji || '📚';
                } else {
                    return '📚';
                }
            } catch (error) {
                console.error('Error generating emoji:', error);
                return '📚';
            }
        },

        checkMobile() {
            this.isMobile = window.innerWidth <= 1024;
        },

        setDefaultState() {
            if (!this.isMobile) {
                this.leftSidebarOpen = true;
                this.rightSidebarOpen = true;
            } else {
                this.leftSidebarOpen = false;
                this.rightSidebarOpen = false;
            }
        },

        toggleSidebar(side) {
            if (side === 'left') {
                this.leftSidebarOpen = !this.leftSidebarOpen;
                if (this.isMobile && this.leftSidebarOpen) {
                    this.rightSidebarOpen = false;
                }
            } else {
                this.rightSidebarOpen = !this.rightSidebarOpen;
                if (this.isMobile && this.rightSidebarOpen) {
                    this.leftSidebarOpen = false;
                }
            }
        },

        closeSidebars() {
            this.leftSidebarOpen = false;
            this.rightSidebarOpen = false;
        },

        get showOverlay() {
            return this.isMobile && (this.leftSidebarOpen || this.rightSidebarOpen);
        },

        get leftSidebarClasses() {
            return {
                'mobile-visible': this.isMobile && this.leftSidebarOpen,
                'collapsed': !this.isMobile && !this.leftSidebarOpen
            };
        },

        get rightSidebarClasses() {
            return {
                'mobile-visible': this.isMobile && this.rightSidebarOpen,
                'collapsed': !this.isMobile && !this.rightSidebarOpen
            };
        },

        get filteredUnits() {
            if (!this.searchQuery) return this.units;
            return this.units.filter(unit => 
                unit.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        },

        selectChapter(chapter) {
            this.units.forEach(unit => unit.active = false);
            chapter.active = true;
            this.selectedChapter = chapter;
            this.saveSelectedChapter(chapter);
            this.loadChapterContent(chapter);
        },

        loadSelectedChapter() {
            const urlParams = new URLSearchParams(window.location.search);
            const urlChapter = urlParams.get('chapter');
            const savedChapter = localStorage.getItem('selectedChapter');
            
            const chapterName = urlChapter || savedChapter;
            if (chapterName) {
                const chapter = this.units.find(unit => unit.name === chapterName);
                if (chapter) {
                    this.selectChapter(chapter);
                }
            }
        },

        saveSelectedChapter(chapter) {
            localStorage.setItem('selectedChapter', chapter.name);
            const url = new URL(window.location);
            url.searchParams.set('chapter', chapter.name);
            window.history.replaceState({}, '', url);
        },

        loadChapterContent(chapter) {
            this.contentLoading = true;
            this.chapterContent = null;
            
            // Initialize chat for this chapter
            this.initializeChat(chapter);
            
            // Auto-load existing resources
            if (chapter.hasQuiz) {
                this.showGeneratedResources = true;
            }
            if (chapter.hasFlashcards) {
                this.showGeneratedFlashcards = true;
            }
            if (chapter.hasCareerPath) {
                this.showGeneratedCareerPath = true;
            }
            if (chapter.hasAudioOverview) {
                this.showGeneratedAudioOverview = true;
            }
            
            setTimeout(() => {
                this.chapterContent = {
                    title: `${chapter.name} Learning Assistant`,
                    emoji: chapter.emoji,
                    description: this.formatRAGSummary(chapter.ragSummary, chapter.name),
                    suggestions: [
                        `Explain key concepts in ${chapter.name}`,
                        `Solve practice problems`,
                        `Understand real-world applications`,
                        `Review important formulas`
                    ]
                };
                this.contentLoading = false;
            }, 1000);
        },
        
        initializeChat(chapter) {
            this.chatId = `${chapter.chId}_${Date.now()}`;
            this.loadChatHistory();
        },
        
        async loadChatHistory() {
            if (!this.chatId) return;
            
            try {
                const response = await fetch(`https://tawf54kc575lndv6wj2woqq5uy0fbfez.lambda-url.ap-south-1.on.aws/?action=getChatHistory&chatId=${this.chatId}`);
                
                if (response.ok) {
                    const result = await response.json();
                    this.messages = result.messages || [];
                }
            } catch (error) {
                console.error('Error loading chat history:', error);
                this.messages = [];
            }
        },
        
        formatRAGSummary(ragSummary, subjectName) {
            if (!ragSummary) {
                return `Welcome to your <strong>${subjectName}</strong> learning companion! I can help you understand key concepts, solve problems, and master the fundamentals. Ask me anything about this topic and I'll provide detailed explanations and guidance.`;
            }
            
            // Clean and format the RAG summary while preserving structure
            let formatted = ragSummary
                // Fix HTML entities
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                // Convert markdown to HTML
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                // Convert headers
                .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                // Remove horizontal rules
                .replace(/^---+$/gm, '<hr>')
                // Convert bullet points
                .replace(/^\* (.+)$/gm, '• $1')
                .replace(/^- (.+)$/gm, '• $1')
                // Remove table formatting but keep content
                .replace(/\|\s*([^|\n]+)\s*\|/g, '$1 | ')
                .replace(/^\s*\|.*$/gm, '')
                // Clean up excessive whitespace
                .replace(/\n{3,}/g, '\n\n')
                .replace(/^\s+/gm, '')
                .trim();
            
            // Convert line breaks to HTML
            formatted = formatted.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
            
            // Wrap in paragraphs
            if (formatted && !formatted.startsWith('<')) {
                formatted = '<p>' + formatted + '</p>';
            }
            
            return formatted;
        },
        
        selectedFiles: [],
        showGeneratedResources: false,
        resourcesLoading: false,
        showGeneratedFlashcards: false,
        flashcardsLoading: false,
        showGeneratedCareerPath: false,
        careerPathLoading: false,
        showFlashcardModal: false,
        flashcards: [],
        currentFlashcard: 0,
        isFlipped: false,
        
        // Chat functionality
        messages: [],
        currentMessage: '',
        isTyping: false,
        chatId: null,
        
        // Audio functionality
        currentAudio: null,
        isAudioPlaying: false,
        audioText: null,
        
        async generateQuiz() {
            if (!this.selectedChapter) {
                alert('Please select a chapter first');
                return;
            }
            
            // If quiz already exists, just open it
            if (this.selectedChapter.hasQuiz) {
                this.openQuiz();
                return;
            }
            
            this.showGeneratedResources = true;
            this.resourcesLoading = true;
            
            try {
                const response = await fetch('https://tawf54kc575lndv6wj2woqq5uy0fbfez.lambda-url.ap-south-1.on.aws/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'generateQuiz',
                        subjectId: this.selectedChapter.chId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Quiz generated successfully:', result);
                    // Mark chapter as having quiz
                    this.selectedChapter.hasQuiz = true;
                    // Open the quiz after generation
                    setTimeout(() => {
                        this.openQuiz();
                    }, 1000);
                } else {
                    console.error('Failed to generate quiz');
                    alert('Failed to generate quiz. Please try again.');
                }
            } catch (error) {
                console.error('Error generating quiz:', error);
                alert('Error generating quiz. Please try again.');
            } finally {
                this.resourcesLoading = false;
            }
        },
        
        async generateFlashcards() {
            if (!this.selectedChapter) {
                alert('Please select a chapter first');
                return;
            }
            
            if (this.selectedChapter.hasFlashcards) {
                this.openFlashcards();
                return;
            }
            
            this.showGeneratedFlashcards = true;
            this.flashcardsLoading = true;
            
            try {
                const response = await fetch('https://tawf54kc575lndv6wj2woqq5uy0fbfez.lambda-url.ap-south-1.on.aws/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'generateFlashcards',
                        subjectId: this.selectedChapter.chId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Flashcards generated successfully:', result);
                    this.selectedChapter.hasFlashcards = true;
                    setTimeout(() => {
                        this.openFlashcards();
                    }, 1000);
                } else {
                    console.error('Failed to generate flashcards');
                    alert('Failed to generate flashcards. Please try again.');
                }
            } catch (error) {
                console.error('Error generating flashcards:', error);
                alert('Error generating flashcards. Please try again.');
            } finally {
                this.flashcardsLoading = false;
            }
        },
        
        async generateCareerPath() {
            if (!this.selectedChapter) {
                alert('Please select a chapter first');
                return;
            }
            
            if (this.selectedChapter.hasCareerPath) {
                this.openCareerPath();
                return;
            }
            
            this.showGeneratedCareerPath = true;
            this.careerPathLoading = true;
            
            try {
                const response = await fetch('https://tawf54kc575lndv6wj2woqq5uy0fbfez.lambda-url.ap-south-1.on.aws/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'generateCareerPath',
                        subjectId: this.selectedChapter.chId
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Career path generated successfully:', result);
                    this.selectedChapter.hasCareerPath = true;
                    setTimeout(() => {
                        this.openCareerPath();
                    }, 1000);
                } else {
                    console.error('Failed to generate career path');
                    alert('Failed to generate career path. Please try again.');
                }
            } catch (error) {
                console.error('Error generating career path:', error);
                alert('Error generating career path. Please try again.');
            } finally {
                this.careerPathLoading = false;
            }
        },
        
        async openFlashcards() {
            console.log('openFlashcards called');
            if (!this.selectedChapter) {
                alert('Please select a chapter first');
                return;
            }
            
            try {
                const response = await fetch(`https://tawf54kc575lndv6wj2woqq5uy0fbfez.lambda-url.ap-south-1.on.aws/?action=getFlashcards&cardId=${this.selectedChapter.chId}`);
                
                if (response.ok) {
                    const result = await response.json();
                    this.flashcards = result.flashcards.flashcards || [];
                } else {
                    console.log('Flashcards not found - showing empty state');
                    this.flashcards = [];
                }
                
                this.currentFlashcard = 0;
                this.isFlipped = false;
                this.showFlashcardModal = true;
                console.log('Modal should be open now:', this.showFlashcardModal);
            } catch (error) {
                console.error('Failed to load flashcards:', error);
                this.flashcards = [];
                this.showFlashcardModal = true;
            }
        },
        
        closeFlashcardModal() {
            this.showFlashcardModal = false;
        },
        
        flipCard() {
            this.isFlipped = !this.isFlipped;
        },
        
        nextCard() {
            if (this.currentFlashcard < this.flashcards.length - 1) {
                this.currentFlashcard++;
                this.isFlipped = false;
            }
        },
        
        prevCard() {
            if (this.currentFlashcard > 0) {
                this.currentFlashcard--;
                this.isFlipped = false;
            }
        },
        
        openQuiz() {
            if (!this.selectedChapter) {
                alert('Please select a chapter first');
                return;
            }
            const quizId = this.selectedChapter.chId;
            window.open(`quiz/index.html?q=${quizId}&ch=${encodeURIComponent(this.selectedChapter.name)}`, '_blank');
        },
        
        openCareerPath() {
            if (!this.selectedChapter) {
                alert('Please select a chapter first');
                return;
            }
            const crId = this.selectedChapter.chId;
            window.open(`career/index.html?cr=${crId}&ch=${encodeURIComponent(this.selectedChapter.name)}`, '_blank');
        },
        
        handleFileSelect(event) {
            const files = Array.from(event.target.files);
            const remainingSlots = 3 - this.selectedFiles.length;
            
            const validFiles = files.slice(0, remainingSlots).filter(file => {
                const isValidType = file.type.includes('pdf') || file.type.includes('image');
                const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
                return isValidType && isValidSize;
            });
            
            validFiles.forEach(file => {
                this.selectedFiles.push({
                    id: Date.now() + Math.random(),
                    name: file.name,
                    type: file.type.includes('pdf') ? 'pdf' : 'image',
                    file: file
                });
            });
            
            event.target.value = '';
        },
        
        removeFile(index) {
            this.selectedFiles.splice(index, 1);
        },
        
        async sendMessage() {
            if (!this.currentMessage.trim() || !this.selectedChapter || this.isTyping) return;
            
            const messageText = this.currentMessage.trim();
            const files = [...this.selectedFiles];
            
            // Add user message
            const userMessage = {
                id: Date.now(),
                role: 'user',
                content: messageText,
                files: files,
                timestamp: new Date().toISOString()
            };
            
            this.messages.push(userMessage);
            this.currentMessage = '';
            this.selectedFiles = [];
            this.isTyping = true;
            
            // Scroll to bottom
            this.$nextTick(() => {
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            });
            
            try {
                // Prepare files for upload
                const fileData = [];
                for (const file of files) {
                    const base64 = await this.fileToBase64(file.file);
                    fileData.push({
                        name: file.name,
                        type: file.type,
                        content: base64
                    });
                }
                
                const response = await fetch('https://tawf54kc575lndv6wj2woqq5uy0fbfez.lambda-url.ap-south-1.on.aws/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'chatMessage',
                        chatId: this.chatId,
                        message: messageText,
                        files: fileData,
                        subjectId: this.selectedChapter.chId,
                        subjectName: this.selectedChapter.name
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    
                    // Add assistant response
                    const assistantMessage = {
                        id: Date.now() + 1,
                        role: 'assistant',
                        content: result.response,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.messages.push(assistantMessage);
                } else {
                    throw new Error('Failed to get response');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                
                // Add error message
                const errorMessage = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                    timestamp: new Date().toISOString()
                };
                
                this.messages.push(errorMessage);
            } finally {
                this.isTyping = false;
                
                // Scroll to bottom
                this.$nextTick(() => {
                    const chatMessages = document.getElementById('chatMessages');
                    if (chatMessages) {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                });
            }
        },
        
        sendSuggestion(suggestion) {
            this.currentMessage = suggestion;
            this.sendMessage();
        },
        
        fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = error => reject(error);
            });
        },
        
        formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        
        formatMessage(content) {
            // Simple markdown parsing for chat messages
            return content
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^• (.+)$/gm, '<li>$1</li>')
                .replace(/^(\d+\. .+)$/gm, '<li>$1</li>')
                .replace(/(\n|^)([^\n]*<li>.*<\/li>[^\n]*)(\n|$)/g, '$1<ul>$2</ul>$3')
                .replace(/\n/g, '<br>');
        },
        
        async generateAudioOverview() {
            if (!this.selectedChapter) {
                alert('Please select a chapter first');
                return;
            }
            
            // If audio is playing, pause it
            if (this.isAudioPlaying) {
                this.pauseAudio();
                return;
            }
            
            // If audio exists but paused, resume it
            if (this.currentAudio && !this.isAudioPlaying) {
                this.playAudio();
                return;
            }
            
            try {
                const language = await this.showLanguageSelector();
                if (!language) return;
                
                const audioBtn = document.querySelector('.audio-overview');
                audioBtn.querySelector('.menu-text').textContent = 'Generating...';
                audioBtn.style.opacity = '0.6';
                
                const overviewText = this.generateOverviewText();
                let finalText = overviewText;
                
                if (language.code !== 'en-IN') {
                    finalText = await this.translateText(overviewText, language.code);
                }
                
                const audioData = await this.generateSarvamAudioData(finalText, language.code);
                
                if (audioData && audioData !== 'browser-tts') {
                    // Save to S3 and database
                    await this.saveAudioOverview(audioData, finalText, language);
                    
                    const audioUrl = URL.createObjectURL(new Blob([audioData], { type: 'audio/wav' }));
                    this.currentAudio = new Audio(audioUrl);
                    this.audioText = finalText;
                    
                    this.currentAudio.onended = () => {
                        this.resetAudioButton();
                    };
                    
                    this.currentAudio.onerror = () => {
                        this.resetAudioButton();
                        alert('Error playing audio');
                    };
                    
                    this.playAudio();
                    this.selectedChapter.hasAudioOverview = true;
                } else if (audioData === 'browser-tts') {
                    // Browser TTS handling
                    this.isAudioPlaying = true;
                    this.updateAudioButton();
                    setTimeout(() => {
                        this.resetAudioButton();
                    }, 3000);
                }
            } catch (error) {
                console.error('Audio error:', error);
                alert('Error generating audio');
                this.resetAudioButton();
            }
        },
        
        playAudio() {
            if (this.currentAudio) {
                this.currentAudio.play();
                this.isAudioPlaying = true;
                this.updateAudioButton();
            }
        },
        
        pauseAudio() {
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.isAudioPlaying = false;
                this.updateAudioButton();
            } else if (this.isAudioPlaying) {
                // For browser TTS
                speechSynthesis.cancel();
                this.isAudioPlaying = false;
                this.resetAudioButton();
            }
        },
        
        updateAudioButton() {
            const audioBtn = document.querySelector('.audio-overview');
            if (audioBtn) {
                if (this.isAudioPlaying) {
                    audioBtn.querySelector('.menu-text').textContent = 'Pause';
                    audioBtn.querySelector('.menu-icon').className = 'ph ph-pause menu-icon';
                } else {
                    audioBtn.querySelector('.menu-text').textContent = 'Play';
                    audioBtn.querySelector('.menu-icon').className = 'ph ph-play menu-icon';
                }
                audioBtn.style.opacity = '1';
            }
        },
        
        resetAudioButton() {
            this.isAudioPlaying = false;
            this.currentAudio = null;
            const audioBtn = document.querySelector('.audio-overview');
            if (audioBtn) {
                audioBtn.querySelector('.menu-text').textContent = 'Audio Overview';
                audioBtn.querySelector('.menu-icon').className = 'ph ph-waveform menu-icon';
                audioBtn.style.opacity = '1';
            }
        },
        
        showLanguageSelector() {
            return new Promise((resolve) => {
                const languages = [
                    { name: 'English', code: 'en-IN' },
                    { name: 'हिंदी', code: 'hi-IN' },
                    { name: 'ગુજરાતી', code: 'gu-IN' }
                ];
                
                const modal = document.createElement('div');
                modal.className = 'language-modal-overlay';
                modal.innerHTML = `
                    <div class="language-modal">
                        <h3>Select Language</h3>
                        <div class="language-options">
                            ${languages.map(lang => `
                                <button class="language-option" data-code="${lang.code}">
                                    ${lang.name}
                                </button>
                            `).join('')}
                        </div>
                        <button class="cancel-btn">Cancel</button>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                modal.addEventListener('click', (e) => {
                    if (e.target.classList.contains('language-option')) {
                        const selectedLang = languages.find(l => l.code === e.target.dataset.code);
                        document.body.removeChild(modal);
                        resolve(selectedLang);
                    } else if (e.target.classList.contains('cancel-btn') || e.target === modal) {
                        document.body.removeChild(modal);
                        resolve(null);
                    }
                });
            });
        },
        
        async translateText(text, targetLanguage) {
            if (targetLanguage === 'en-IN') return text;
            
            try {
                const response = await fetch('https://api.sarvam.ai/translate', {
                    method: 'POST',
                    headers: {
                        'API-Subscription-Key': 'sk_dmyzimsr_JV1XjA2ViV8MVmNzgAGkR7kD',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        input: text,
                        source_language_code: 'en-IN',
                        target_language_code: targetLanguage,
                        model: 'sarvam-translate:v1'
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    return result.translated_text || text;
                }
                console.error('Translation failed:', response.status, await response.text());
                return text;
            } catch (error) {
                console.error('Translation error:', error);
                return text;
            }
        },
        
        async generateSarvamAudioData(text, languageCode) {
            try {
                const response = await fetch('https://api.sarvam.ai/text-to-speech', {
                    method: 'POST',
                    headers: {
                        'API-Subscription-Key': 'sk_dmyzimsr_JV1XjA2ViV8MVmNzgAGkR7kD',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: [text],
                        target_language_code: languageCode,
                        speaker: 'anushka',
                        pitch: 0,
                        pace: 1.0,
                        loudness: 1.0,
                        speech_sample_rate: 8000,
                        enable_preprocessing: true,
                        model: 'bulbul:v2'
                    })
                });
                
                const responseText = await response.text();
                console.log('Sarvam API response:', response.status, responseText);
                
                if (response.ok) {
                    const result = JSON.parse(responseText);
                    if (result.audios && result.audios.length > 0) {
                        const audioData = result.audios[0];
                        const byteCharacters = atob(audioData);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        return new Uint8Array(byteNumbers);
                    }
                }
                
                console.log('Sarvam failed, using browser TTS');
                return this.generateBrowserTTS(text);
            } catch (error) {
                console.error('Sarvam audio error:', error);
                return this.generateBrowserTTS(text);
            }
        },
        
        async saveAudioOverview(audioData, text, language) {
            try {
                const base64Audio = btoa(String.fromCharCode(...audioData));
                
                const response = await fetch('https://tawf54kc575lndv6wj2woqq5uy0fbfez.lambda-url.ap-south-1.on.aws/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'saveAudioOverview',
                        subjectId: this.selectedChapter.chId,
                        audioData: base64Audio,
                        text: text,
                        language: language.code,
                        languageName: language.name
                    })
                });
                
                if (!response.ok) {
                    console.error('Failed to save audio overview');
                }
            } catch (error) {
                console.error('Error saving audio overview:', error);
            }
        },
        
        generateBrowserTTS(text) {
            return new Promise((resolve, reject) => {
                if ('speechSynthesis' in window) {
                    speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.rate = 0.9;
                    utterance.pitch = 1;
                    utterance.volume = 0.8;
                    
                    const voices = speechSynthesis.getVoices();
                    const preferredVoice = voices.find(voice => 
                        voice.name.includes('Google') || 
                        voice.name.includes('Microsoft') ||
                        voice.lang.startsWith('en')
                    );
                    if (preferredVoice) {
                        utterance.voice = preferredVoice;
                    }
                    
                    utterance.onend = () => resolve('browser-tts');
                    utterance.onerror = () => reject(new Error('Browser TTS failed'));
                    
                    speechSynthesis.speak(utterance);
                    resolve('browser-tts');
                } else {
                    reject(new Error('TTS not supported'));
                }
            });
        },
        
        generateOverviewText() {
            const chapter = this.selectedChapter;
            let text = `Welcome to your ${chapter.name} learning session. `;
            
            if (chapter.ragSummary) {
                const summary = chapter.ragSummary
                    .replace(/<[^>]*>/g, '')
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .replace(/\n+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                const shortSummary = summary.length > 300 ? summary.substring(0, 300) + '...' : summary;
                text += shortSummary;
            } else {
                text += `This chapter covers important concepts and practical knowledge in ${chapter.name}. You'll learn key theories, understand real-world applications, and develop problem-solving skills.`;
            }
            
            text += ` Feel free to ask me any questions about ${chapter.name}, and I'll help you understand the concepts step by step.`;
            return text;
        },
        
        logout() {
            firebase.auth().signOut().then(() => {
                window.location.href = 'login/';
            }).catch((error) => {
                console.error('Logout error:', error);
            });
        }
    }));
});