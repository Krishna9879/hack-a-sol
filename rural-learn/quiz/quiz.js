function quizApp() {
    return {
        currentQuestion: 0,
        selectedAnswers: {},
        quizData: {},
        questions: [],
        loaded: false,
        startTime: null,
        questionStartTime: null,
        questionTimes: {},
        timeRemaining: 0,
        timerInterval: null,
        quizSubmitted: false,
        score: 0,
        showModal: false,
        totalTimeSpent: 0,
        avgTimePerQuestion: 0,
        sidebarOpen: false,
        rightSidebarOpen: false,
        searchQuery: '',
        showShimmer: true,
        showEmptyState: false,
        units: [
            { name: 'Thermodynamics', emoji: '🌡️', active: true },
            { name: 'Solid-state chemistry', emoji: '🔷', active: false },
            { name: 'Solutions', emoji: '🧪', active: false },
            { name: 'Electrochemistry', emoji: '⚡', active: false },
            { name: 'Chemical kinetics', emoji: '⏱️', active: false },
            { name: 'Surface chemistry', emoji: '🌊', active: false },
            { name: 'The p block elements', emoji: '⚛️', active: false },
            { name: 'D and f-block elements', emoji: '🔬', active: false },
            { name: 'Coordination complex', emoji: '🧬', active: false },
            { name: 'Haloalkanes and Haloarenes', emoji: '💧', active: false },
            { name: 'Alcohols phenols and ethers', emoji: '🍷', active: false },
            { name: 'Aldehydes, ketones and carboxylic acids', emoji: '🧫', active: false },
            { name: 'Amines', emoji: '🌿', active: false },
            { name: 'Biomolecules', emoji: '🧬', active: false },
            { name: 'Polymer', emoji: '🔗', active: false },
            { name: 'Chemistry in everyday life', emoji: '❤️', active: false }
        ],
        
        init() {
            this.loadQuizData();
            setTimeout(() => {
                this.showShimmer = false;
            }, 1000);
        },
        
        async loadQuizData() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const requestedQuizId = urlParams.get('q');
                const chapterName = urlParams.get('ch');
                
                // Set active chapter in sidebar
                if (chapterName) {
                    this.units.forEach(unit => {
                        unit.active = unit.name === decodeURIComponent(chapterName);
                    });
                }
                
                if (!requestedQuizId) {
                    console.log('No quiz ID provided - showing empty state');
                    this.showEmptyState = true;
                    this.loaded = true;
                    return;
                }
                
                // Load quiz from database
                const response = await fetch(`https://tawf54kc575lndv6wj2woqq5uy0fbfez.lambda-url.ap-south-1.on.aws/?action=getQuiz&quizId=${requestedQuizId}`);
                
                if (!response.ok) {
                    console.log('Quiz not found in database - showing empty state');
                    this.showEmptyState = true;
                    this.loaded = true;
                    return;
                }
                
                const result = await response.json();
                this.quizData = result.quiz;
                
                console.log('Loaded quiz from database:', this.quizData);
                
                this.showEmptyState = false;
                this.questions = this.quizData.questions;
                
                const storageKey = `quiz_${this.quizData.quizId}`;
                const saved = localStorage.getItem(storageKey);
                
                if (saved) {
                    const data = JSON.parse(saved);
                    this.currentQuestion = data.currentQuestion || 0;
                    this.selectedAnswers = data.selectedAnswers || {};
                    this.timeRemaining = data.timeRemaining >= 0 ? data.timeRemaining : this.quizData.timeAllowed * 60;
                    this.startTime = data.startTime || Date.now();
                    this.quizSubmitted = data.quizSubmitted || false;
                    this.score = data.score || 0;
                    this.questionTimes = data.questionTimes || {};
                } else {
                    this.timeRemaining = this.quizData.timeAllowed * 60;
                    this.startTime = Date.now();
                }
                
                this.saveProgress();
                
                if (!this.quizSubmitted) {
                    this.startTimer();
                    this.startQuestionTimer();
                }
                this.loaded = true;
            } catch (error) {
                console.error('Failed to load quiz data:', error);
                this.showEmptyState = true;
                this.loaded = true;
            }
        },
        
        startTimer() {
            this.timerInterval = setInterval(() => {
                this.timeRemaining--;
                this.saveProgress();
                if (this.timeRemaining <= 0) {
                    this.submitQuiz();
                }
            }, 1000);
        },
        
        startQuestionTimer() {
            this.questionStartTime = Date.now();
        },
        
        recordQuestionTime() {
            if (this.questionStartTime) {
                const timeSpent = Date.now() - this.questionStartTime;
                this.questionTimes[this.currentQuestion] = timeSpent;
            }
        },

        get totalQuestions() {
            return this.questions.length;
        },
        
        get quizName() {
            return this.quizData.quizName || 'Quiz';
        },
        
        get timeAllowed() {
            return this.quizData.timeAllowed || 30;
        },

        get progress() {
            return this.totalQuestions > 0 ? ((this.currentQuestion + 1) / this.totalQuestions) * 100 : 0;
        },

        get currentQuestionData() {
            if (!this.loaded || this.questions.length === 0) {
                return { text: 'Loading...', options: [], id: 0 };
            }
            return this.questions[this.currentQuestion] || { text: 'Question not found', options: [], id: 0 };
        },

        get answeredCount() {
            return Object.keys(this.selectedAnswers).length;
        },

        selectAnswer(questionId, optionIndex) {
            this.selectedAnswers[questionId] = optionIndex;
            this.saveProgress();
        },

        isSelected(questionId, optionIndex) {
            return this.selectedAnswers[questionId] === optionIndex;
        },

        goToQuestion(index) {
            if (index >= 0 && index < this.totalQuestions) {
                this.recordQuestionTime();
                this.currentQuestion = index;
                this.startQuestionTimer();
                this.saveProgress();
            }
        },

        nextQuestion() {
            if (this.currentQuestion < this.totalQuestions - 1) {
                this.recordQuestionTime();
                this.currentQuestion++;
                this.startQuestionTimer();
                this.saveProgress();
            }
        },

        previousQuestion() {
            if (this.currentQuestion > 0) {
                this.recordQuestionTime();
                this.currentQuestion--;
                this.startQuestionTimer();
                this.saveProgress();
            }
        },

        getQuestionStatus(index) {
            if (!this.questions[index]) return 'unanswered';
            const questionId = this.questions[index].id;
            if (this.selectedAnswers[questionId] !== undefined) {
                return 'answered';
            }
            if (index === this.currentQuestion) {
                return 'current';
            }
            return 'unanswered';
        },
        
        calculateScore() {
            let correct = 0;
            this.questions.forEach(question => {
                if (this.selectedAnswers[question.id] === question.correct) {
                    correct++;
                }
            });
            return Math.round((correct / this.totalQuestions) * 100);
        },
        
        submitQuiz() {
            if (this.quizSubmitted) return;
            
            this.recordQuestionTime();
            clearInterval(this.timerInterval);
            this.score = this.calculateScore();
            this.quizSubmitted = true;
            
            this.totalTimeSpent = Date.now() - this.startTime;
            this.avgTimePerQuestion = this.totalTimeSpent / this.totalQuestions;
            
            this.saveProgress();
            this.showModal = true;
        },
        
        saveProgress() {
            if (!this.quizData.quizId) return;
            
            const storageKey = `quiz_${this.quizData.quizId}`;
            const data = {
                currentQuestion: this.currentQuestion,
                selectedAnswers: this.selectedAnswers,
                timeRemaining: this.timeRemaining,
                startTime: this.startTime,
                quizSubmitted: this.quizSubmitted,
                score: this.score,
                questionTimes: this.questionTimes,
                lastSaved: Date.now()
            };
            
            try {
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (error) {
                console.error('Failed to save progress:', error);
            }
        },
        
        get formattedTimeRemaining() {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        },
        
        toggleSidebar() {
            console.log('Toggle sidebar clicked, current state:', this.sidebarOpen);
            this.sidebarOpen = !this.sidebarOpen;
            if (this.sidebarOpen) this.rightSidebarOpen = false;
            console.log('New sidebar state:', this.sidebarOpen);
        },
        
        toggleRightSidebar() {
            console.log('Toggle right sidebar clicked, current state:', this.rightSidebarOpen);
            this.rightSidebarOpen = !this.rightSidebarOpen;
            if (this.rightSidebarOpen) this.sidebarOpen = false;
            console.log('New right sidebar state:', this.rightSidebarOpen);
        },
        
        closeSidebars() {
            console.log('Closing sidebars');
            this.sidebarOpen = false;
            this.rightSidebarOpen = false;
        },
        
        resetQuiz() {
            if (!this.quizData.quizId) return;
            const storageKey = `quiz_${this.quizData.quizId}`;
            localStorage.removeItem(storageKey);
            location.reload();
        },
        
        get filteredUnits() {
            if (!this.searchQuery) return this.units;
            return this.units.filter(unit => 
                unit.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }
    };
}