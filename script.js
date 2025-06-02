document.addEventListener('DOMContentLoaded', function() {
    // Log message to confirm script is running
    console.log("*** NEW SCRIPT VERSION 1.0.3 LOADED ***");
    console.log("Click on any word to hear it pronounced");
    
    // Add CSS for database indicator
    const dbIndicatorStyle = document.createElement('style');
    dbIndicatorStyle.textContent = `
        .phrase-container {
            position: relative;
        }
        
        .db-indicator {
            position: absolute;
            top: 5px;
            right: 5px;
            font-size: 0.75rem;
            background-color: #1565c0;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
            z-index: 10;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
    `;
    document.head.appendChild(dbIndicatorStyle);
    
    // Initialize the database
    window.phraseDB.init()
        .then(() => {
            console.log("Database initialized successfully");
        })
        .catch(error => {
            console.error("Failed to initialize database:", error);
        });
    
    const categoryCards = document.querySelectorAll('.category-card');
    const resultsContent = document.getElementById('results-content');
    const loadMoreBtn = document.getElementById('load-more');
    const styleFilterContainer = document.querySelector('.style-filter-container');
    const styleFilterBtns = document.querySelectorAll('.style-filter-btn');
    const sourceLanguageSelect = document.getElementById('source-language');
    const targetLanguageSelect = document.getElementById('target-language');
    const favoritesContainer = document.querySelector('.favorites-container');
    const favoritesContent = document.getElementById('favorites-content');
    const navigationItems = document.querySelectorAll('.nav-item');
    const mainContentArea = document.querySelector('.categories-grid').parentElement;
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    // Global variables for current state
    let currentCategory = '';
    let currentOffset = 0;
    let currentStyle = 'all';
    let phrasesData = [];
    let audioContext = null;
    let favorites = JSON.parse(localStorage.getItem('phrasesFavorites')) || [];
    let onboardingData = JSON.parse(localStorage.getItem('onboardingData')) || { name: 'Friend' }; // Default if not found
    
    // Add click event to category cards
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            currentCategory = category;
            currentOffset = 0;
            currentStyle = 'all';
            resetStyleFilters();
            
            // Show phrases heading, hide no-phrases heading
            document.getElementById('phrases-title').style.display = 'block';
            document.getElementById('no-phrases-title').style.display = 'none';
            
            // Uppdatera kategorititeln omedelbart
            document.getElementById('current-category').textContent = category;
            
            // Highlight the selected category
            categoryCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            
            // Scrolla direkt till resultatrubriken
            document.getElementById('phrases-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Add loading indication
            resultsContent.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading phrases for ${category}...</p>
                </div>
            `;
            
            // Fetch phrases
            fetchPhrases(category);
        });
    });
    
    // Mobile menu toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            const navMenu = document.querySelector('.nav-menu');
            const loginBtn = document.querySelector('.login-btn');
            
            navMenu.classList.toggle('active');
            loginBtn.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
            
            // Toggle animation for hamburger icon
            const bars = mobileMenuToggle.querySelectorAll('.bar');
            if (mobileMenuToggle.classList.contains('active')) {
                bars[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
            } else {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });
    }
    
    // Close mobile menu when clicking on a nav item
    navigationItems.forEach(item => {
        item.addEventListener('click', function() {
            const navMenu = document.querySelector('.nav-menu');
            const loginBtn = document.querySelector('.login-btn');
            
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                loginBtn.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                
                // Reset hamburger icon
                const bars = mobileMenuToggle.querySelectorAll('.bar');
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });
    });
    
    // Handle navigation
    navigationItems.forEach(item => {
        item.addEventListener('click', function(event) {
            event.preventDefault();
            
            // Remove active class from all items
            navigationItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to the clicked item
            this.classList.add('active');
            
            const navType = this.textContent.trim();
            
            // Handle navigation based on clicked item
            switch(navType) {
                case 'Phrases':
                    showMainContent();
                    break;
                case 'Favorites':
                    showFavorites();
                    break;
                case 'About':
                    showAboutPage();
                    break;
                case 'Contact':
                    showContactPage();
                    break;
                case 'Login / Signup':
                    showLoginPage();
                    break;
            }
        });
    });
    
    // Logotyp klick - visa frassidan
    const logoLink = document.querySelector('.logo-link');
    if (logoLink) {
        logoLink.addEventListener('click', function(event) {
            event.preventDefault();
            
            // Remove active class from all nav items
            navigationItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to Phrases nav item
            const phrasesNavItem = Array.from(navigationItems).find(item => item.textContent.trim() === 'Phrases');
            if (phrasesNavItem) {
                phrasesNavItem.classList.add('active');
            }
            
            // Show main content
            showMainContent();
        });
    }
    
    function showMainContent() {
        // Show the main content
        document.querySelector('.categories-grid').style.display = 'grid';
        document.querySelector('.category-instruction').style.display = 'block';
        document.querySelector('.results-container').style.display = 'block';
        document.querySelector('.language-selectors').style.display = 'flex';
        
        // Hide favorites if visible
        favoritesContainer.style.display = 'none';
        
        // Hide any custom pages
        const customPages = document.querySelectorAll('.custom-page');
        customPages.forEach(page => page.remove());
    }
    
    function showFavorites() {
        // Hide the main content
        document.querySelector('.categories-grid').style.display = 'none';
        document.querySelector('.category-instruction').style.display = 'none';
        document.querySelector('.results-container').style.display = 'none';
        document.querySelector('.language-selectors').style.display = 'none';
        
        // Show favorites
        favoritesContainer.style.display = 'block';
        
        // Load favorites data
        loadFavorites();
        
        // Hide any custom pages
        const customPages = document.querySelectorAll('.custom-page');
        customPages.forEach(page => page.remove());
    }
    
    function hideMainContentComponents() {
        // Hide the main content components
        document.querySelector('.categories-grid').style.display = 'none';
        document.querySelector('.category-instruction').style.display = 'none';
        document.querySelector('.results-container').style.display = 'none';
        document.querySelector('.language-selectors').style.display = 'none';
        favoritesContainer.style.display = 'none';
    }
    
    function loadFavorites() {
        // Load favorites from localStorage
        const favorites = JSON.parse(localStorage.getItem('phrasesFavorites')) || [];
        
        if (favorites.length === 0) {
            favoritesContent.innerHTML = '<p class="no-favorites">You have no favorites yet. Click the star icon on phrases to add them here.</p>';
            return;
        }
        
        let html = '';
        
        favorites.forEach(phrase => {
            html += createPhraseHTML(phrase, true);
        });
        
        favoritesContent.innerHTML = html;
        
        // Add event listeners to the newly created elements
        addEventListenersToResults();
    }
    
    function showAboutPage() {
        // Hide the main content
        hideMainContentComponents();
        
        // Remove any existing custom pages
        const customPages = document.querySelectorAll('.custom-page');
        customPages.forEach(page => page.remove());
        
        // Create and show the about page
        const aboutPage = document.createElement('div');
        aboutPage.className = 'custom-page about-page';
        aboutPage.innerHTML = `
            <div class="page-container">
                <h1>About Say it like that</h1>
                <div class="about-content">
                    <p>Say it like that is a language learning tool designed to help you master practical, everyday phrases in multiple languages.</p>
                    
                    <h2>Our Approach</h2>
                    <p>Unlike traditional language learning that focuses on grammar rules and vocabulary lists, we believe in learning language as it's actually used in real-life situations.</p>
                    
                    <p>Each phrase comes with:</p>
                    <ul>
                        <li>Word-by-word translations to help you understand the structure</li>
                        <li>Pronunciation guides with native speakers</li>
                        <li>Context about when and how to use each phrase</li>
                        <li>Cultural notes about appropriate usage</li>
                    </ul>
                    
                    <h2>Our Story</h2>
                    <p>Say it like that was created by language enthusiasts who were frustrated with traditional learning methods. After years of studying textbooks but still feeling lost in real conversations, we created the tool we wished we had.</p>
                    
                    <h2>Join Our Community</h2>
                    <p>We're growing our library of phrases every day. If you have suggestions for new categories or phrases, we'd love to hear from you!</p>
                </div>
            </div>
        `;
        
        // Insert the about page before the CTA section
        const ctaContainer = document.querySelector('.cta-container');
        mainContentArea.insertBefore(aboutPage, ctaContainer);
    }
    
    function showContactPage() {
        // Hide the main content
        hideMainContentComponents();
        
        // Remove any existing custom pages
        const customPages = document.querySelectorAll('.custom-page');
        customPages.forEach(page => page.remove());
        
        // Create and show the contact page
        const contactPage = document.createElement('div');
        contactPage.className = 'custom-page contact-page';
        contactPage.innerHTML = `
            <div class="page-container">
                <h1>Contact Us</h1>
                <div class="contact-content">
                    <p>We'd love to hear from you! Whether you have a question, feedback, or just want to say hello, feel free to reach out.</p>
                    
                    <form class="contact-form">
                        <div class="form-group">
                            <label for="name">Name</label>
                            <input type="text" id="name" placeholder="Your name">
                        </div>
                        
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" placeholder="Your email address">
                        </div>
                        
                        <div class="form-group">
                            <label for="subject">Subject</label>
                            <select id="subject">
                                <option value="question">I have a question</option>
                                <option value="feedback">I want to give feedback</option>
                                <option value="suggestion">I have a phrase suggestion</option>
                                <option value="business">Business inquiry</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="message">Message</label>
                            <textarea id="message" rows="5" placeholder="Your message"></textarea>
                        </div>
                        
                        <button type="submit" class="submit-btn">Send Message</button>
                    </form>
                    
                    <div class="contact-info">
                        <h2>Other Ways to Connect</h2>
                        <p>Email: <a href="mailto:hello@sayitlikethat.com">hello@sayitlikethat.com</a></p>
                        <p>Follow us: 
                            <a href="#" class="social-link">Twitter</a> • 
                            <a href="#" class="social-link">Instagram</a> • 
                            <a href="#" class="social-link">Facebook</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // Insert the contact page before the CTA section
        const ctaContainer = document.querySelector('.cta-container');
        mainContentArea.insertBefore(contactPage, ctaContainer);
        
        // Add submit event listener to the form
        const contactForm = contactPage.querySelector('.contact-form');
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            alert('Thank you for your message! We will get back to you soon.');
            contactForm.reset();
        });
    }
    
    function showLoginPage() {
        // Hide the main content
        hideMainContentComponents();
        
        // Remove any existing custom pages
        const customPages = document.querySelectorAll('.custom-page');
        customPages.forEach(page => page.remove());
        
        // Create and show the login page
        const loginPage = document.createElement('div');
        loginPage.className = 'custom-page login-page';
        loginPage.innerHTML = `
            <div class="auth-container">
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="login">Login</button>
                    <button class="auth-tab" data-tab="signup">Sign Up</button>
                </div>
                
                <div class="auth-content">
                    <form id="login-form" class="auth-form">
                        <div class="form-group">
                            <label for="login-email">Email</label>
                            <input type="email" id="login-email" placeholder="Your email address" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="login-password">Password</label>
                            <input type="password" id="login-password" placeholder="Your password" required>
                        </div>
                        
                        <div class="form-footer">
                            <div class="remember-me">
                                <input type="checkbox" id="remember">
                                <label for="remember">Remember me</label>
                            </div>
                            <a href="#" class="forgot-password">Forgot password?</a>
                        </div>
                        
                        <button type="submit" class="auth-submit">Log In</button>
                    </form>
                    
                    <form id="signup-form" class="auth-form" style="display: none;">
                        <div class="form-group">
                            <label for="signup-name">Full Name</label>
                            <input type="text" id="signup-name" placeholder="Your full name" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="signup-email">Email</label>
                            <input type="email" id="signup-email" placeholder="Your email address" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="signup-password">Password</label>
                            <input type="password" id="signup-password" placeholder="Choose a password" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="signup-confirm">Confirm Password</label>
                            <input type="password" id="signup-confirm" placeholder="Confirm your password" required>
                        </div>
                        
                        <div class="terms">
                            <input type="checkbox" id="terms" required>
                            <label for="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
                        </div>
                        
                        <button type="submit" class="auth-submit">Sign Up</button>
                    </form>
                </div>
                
                <div class="social-login">
                    <p>Or continue with</p>
                    <div class="social-buttons">
                        <button class="social-button google">
                            <span class="social-icon">G</span>
                            <span>Google</span>
                        </button>
                        <button class="social-button facebook">
                            <span class="social-icon">f</span>
                            <span>Facebook</span>
                        </button>
                        <button class="social-button apple">
                            <span class="social-icon">a</span>
                            <span>Apple</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Insert the login page before the CTA section
        const ctaContainer = document.querySelector('.cta-container');
        mainContentArea.insertBefore(loginPage, ctaContainer);
        
        // Add tab switching functionality
        const authTabs = loginPage.querySelectorAll('.auth-tab');
        const loginForm = loginPage.querySelector('#login-form');
        const signupForm = loginPage.querySelector('#signup-form');
        
        authTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Update active tab
                authTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Show the corresponding form
                const tabType = this.getAttribute('data-tab');
                if (tabType === 'login') {
                    loginForm.style.display = 'block';
                    signupForm.style.display = 'none';
                } else {
                    loginForm.style.display = 'none';
                    signupForm.style.display = 'block';
                }
            });
        });
        
        // Add form submission handlers
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            alert('Login functionality would be implemented here.');
        });
        
        signupForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const password = signupForm.querySelector('#signup-password').value;
            const confirm = signupForm.querySelector('#signup-confirm').value;
            
            if (password !== confirm) {
                alert('Passwords do not match');
                return;
            }
            
            alert('Sign up functionality would be implemented here.');
        });
    }
    
    // DeepSeek API settings
    const DEEPSEEK_API_KEY = 'sk-add35bac795a45528576d6ae8ee2b5dc';
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
    
    // Language flags and display names
    const languageData = {
        'italian': { flag: '🇮🇹', name: 'Italian' },
        'french': { flag: '🇫🇷', name: 'French' },
        'spanish': { flag: '🇪🇸', name: 'Spanish' },
        'german': { flag: '🇩🇪', name: 'German' },
        'portuguese': { flag: '🇵🇹', name: 'Portuguese' },
        'polish': { flag: '🇵🇱', name: 'Polish' },
        'swedish': { flag: '🇸🇪', name: 'Swedish' },
        'english': { flag: '🇬🇧', name: 'English' }
    };
    
    // Multi-language translations for common phrases
    const translationData = {
        "Non capisco.": {
            "italian": "Non capisco.",
            "spanish": "No entiendo.",
            "french": "Je ne comprends pas.",
            "german": "Ich verstehe nicht.",
            "portuguese": "Eu não entendo.",
            "polish": "Nie rozumiem.",
            "swedish": "Jag förstår inte.",
            "english": "I don't understand."
        },
        "Grazie mille!": {
            "italian": "Grazie mille!",
            "spanish": "¡Muchas gracias!",
            "french": "Merci beaucoup !",
            "german": "Vielen Dank!",
            "portuguese": "Muito obrigado!",
            "polish": "Dziękuję bardzo!",
            "swedish": "Tack så mycket!",
            "english": "Thank you very much!"
        },
        "Scusi, può aiutarmi?": {
            "italian": "Scusi, può aiutarmi?",
            "spanish": "Disculpe, ¿puede ayudarme?",
            "french": "Excusez-moi, pouvez-vous m'aider ?",
            "german": "Entschuldigung, können Sie mir helfen?",
            "portuguese": "Com licença, pode me ajudar?",
            "polish": "Przepraszam, czy może mi pan pomóc?",
            "swedish": "Ursäkta, kan du hjälpa mig?",
            "english": "Excuse me, can you help me?"
        },
        "Jag förstår inte.": {
            "swedish": "Jag förstår inte.",
            "english": "I don't understand.",
            "italian": "Non capisco.",
            "spanish": "No entiendo.",
            "french": "Je ne comprends pas.",
            "german": "Ich verstehe nicht.",
            "portuguese": "Eu não entendo.",
            "polish": "Nie rozumiem."
        },
        "Var ligger stationen?": {
            "swedish": "Var ligger stationen?",
            "english": "Where is the station?",
            "italian": "Dov'è la stazione?",
            "spanish": "¿Dónde está la estación?",
            "french": "Où est la gare?",
            "german": "Wo ist der Bahnhof?",
            "portuguese": "Onde fica a estação?",
            "polish": "Gdzie jest stacja?"
        },
        "Ursäkta, kan du hjälpa mig?": {
            "swedish": "Ursäkta, kan du hjälpa mig?",
            "english": "Excuse me, can you help me?",
            "italian": "Scusi, può aiutarmi?",
            "spanish": "Disculpe, ¿puede ayudarme?",
            "french": "Excusez-moi, pouvez-vous m'aider?",
            "german": "Entschuldigung, können Sie mir helfen?",
            "portuguese": "Com licença, pode me ajudar?",
            "polish": "Przepraszam, czy może mi Pan/Pani pomóc?"
        },
        "Tack så mycket!": {
            "swedish": "Tack så mycket!",
            "english": "Thank you very much!",
            "italian": "Grazie mille!",
            "spanish": "¡Muchas gracias!",
            "french": "Merci beaucoup!",
            "german": "Vielen Dank!",
            "portuguese": "Muito obrigado!",
            "polish": "Dziękuję bardzo!"
        },
        "Hur mycket kostar det?": {
            "swedish": "Hur mycket kostar det?",
            "english": "How much does it cost?",
            "italian": "Quanto costa?",
            "spanish": "¿Cuánto cuesta?",
            "french": "Combien ça coûte?",
            "german": "Wie viel kostet es?",
            "portuguese": "Quanto custa?",
            "polish": "Ile to kosztuje?"
        },
        "Hai degli occhi bellissimi.": {
            "italian": "Hai degli occhi bellissimi.",
            "english": "You have beautiful eyes.",
            "swedish": "Du har vackra ögon.",
            "spanish": "Tienes unos ojos hermosos.",
            "french": "Tu as de beaux yeux.",
            "german": "Du hast wunderschöne Augen.",
            "portuguese": "Você tem olhos lindos.",
            "polish": "Masz piękne oczy."
        },
        "Du har vackra ögon.": {
            "swedish": "Du har vackra ögon.",
            "english": "You have beautiful eyes.",
            "italian": "Hai degli occhi bellissimi.",
            "spanish": "Tienes unos ojos hermosos.",
            "french": "Tu as de beaux yeux.",
            "german": "Du hast wunderschöne Augen.",
            "portuguese": "Você tem olhos lindos.",
            "polish": "Masz piękne oczy."
        },
        "Posso offrirti da bere?": {
            "italian": "Posso offrirti da bere?",
            "english": "Can I buy you a drink?",
            "swedish": "Kan jag bjuda dig på något att dricka?",
            "spanish": "¿Puedo invitarte a una bebida?",
            "french": "Puis-je t'offrir un verre ?",
            "german": "Kann ich dir einen Drink anbieten?",
            "portuguese": "Posso te pagar uma bebida?",
            "polish": "Czy mogę postawić ci drinka?"
        },
        "Kan jag bjuda dig på något att dricka?": {
            "swedish": "Kan jag bjuda dig på något att dricka?",
            "english": "Can I buy you a drink?",
            "italian": "Posso offrirti da bere?",
            "spanish": "¿Puedo invitarte a una bebida?",
            "french": "Puis-je t'offrir un verre ?",
            "german": "Kann ich dir einen Drink anbieten?",
            "portuguese": "Posso te pagar uma bebida?",
            "polish": "Czy mogę postawić ci drinka?"
        },
        "Mi piacerebbe conoscerti meglio.": {
            "italian": "Mi piacerebbe conoscerti meglio.",
            "english": "I would like to get to know you better.",
            "swedish": "Jag skulle vilja lära känna dig bättre.",
            "spanish": "Me gustaría conocerte mejor.",
            "french": "J'aimerais mieux te connaître.",
            "german": "Ich würde dich gerne besser kennenlernen.",
            "portuguese": "Eu gostaria de te conhecer melhor.",
            "polish": "Chciałbym/Chciałabym poznać cię lepiej."
        },
        "Jag skulle vilja lära känna dig bättre.": {
            "swedish": "Jag skulle vilja lära känna dig bättre.",
            "english": "I would like to get to know you better.",
            "italian": "Mi piacerebbe conoscerti meglio.",
            "spanish": "Me gustaría conocerte mejor.",
            "french": "J'aimerais mieux te connaître.",
            "german": "Ich würde dich gerne besser kennenlernen.",
            "portuguese": "Eu gostaria de te conhecer melhor.",
            "polish": "Chciałbym/Chciałabym poznać cię lepiej."
        }
    };
    
    // Update language title when source language changes
    sourceLanguageSelect.addEventListener('change', function() {
        const selectedLang = this.value;
        
        // Reset current state and refresh UI
        currentCategory = '';
        currentOffset = 0;
        currentStyle = 'all';
        resultsContent.innerHTML = '<div class="no-results">Select a category to learn phrases</div>';
        styleFilterContainer.style.display = 'none';
        loadMoreBtn.style.display = 'none';
        
        // Update UI for existing data if any
        if (phrasesData.length > 0) {
            displayResults(phrasesData, currentCategory);
        }
    });
    
    // Update UI when target language changes
    targetLanguageSelect.addEventListener('change', function() {
        // Update UI for existing data if any
        if (phrasesData.length > 0) {
            displayResults(phrasesData, currentCategory);
        }
    });
    
    // Initialize audio context on user interaction
    document.addEventListener('click', initAudioContext, { once: true });
    
    function initAudioContext() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            console.log('AudioContext initialized');
        } catch (e) {
            console.error('Web Audio API not supported in this browser', e);
        }
    }
    
    // Style filter buttons click handler
    styleFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const style = this.getAttribute('data-style');
            currentStyle = style;
            
            // Update active class
            styleFilterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter phrases by style
            filterPhrasesByStyle(style);
        });
    });
    
    // Load more button click handler
    loadMoreBtn.addEventListener('click', function() {
        // Visa laddningsanimation på knappen
        const originalText = loadMoreBtn.textContent;
        loadMoreBtn.textContent = 'Loading...';
        loadMoreBtn.disabled = true;
        
        // Öka offset för att få nya fraser
        currentOffset += 3;
        
        // Försök hämta nya fraser via API
        fetchPhrases(currentCategory, currentOffset)
            .then(() => {
                // Återställ knappen när hämtningen är klar
                loadMoreBtn.textContent = originalText;
                loadMoreBtn.disabled = false;
            })
            .catch(error => {
                console.error('Error loading more phrases:', error);
                loadMoreBtn.textContent = 'Try again';
                loadMoreBtn.disabled = false;
            });
    });
    
    // Fetch phrases for a category
    async function fetchPhrases(category, offset = 0) {
        // Show loading spinner
        if (offset === 0) {
            resultsContent.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                </div>
            `;
        }

        try {
            const sourceLang = sourceLanguageSelect.value;
            const targetLang = targetLanguageSelect.value;
            
            // För första begäran
            let data;
            let waitingForApiResponse = true; // Flag to track if we're still waiting for API
            let fallbackDataDisplayed = false; // Flag to track if fallback data has been displayed
            
            if (offset === 0) {
                // First, try to get phrases from the database
                try {
                    const dbPhrases = await window.phraseDB.getPhrasesByCategory(category, sourceLang);
                    
                    // If we have phrases in the database, use them
                    if (dbPhrases && dbPhrases.length > 0) {
                        console.log(`Using ${dbPhrases.length} phrases from database for category "${category}"`);
                        // Mark these phrases as coming from database
                        data = dbPhrases.map(phrase => ({...phrase, fromDatabase: true}));
                        waitingForApiResponse = false; // Don't need to wait for API
                    } else {
                        // If no phrases in database, try the API
                        console.log(`No phrases in database for category "${category}", trying API`);
                        try {
                            // Försök att hämta fraser från DeepSeek API med timeout
                            const timeoutPromise = new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('API request timed out')), 40000)); // Increased to 40 seconds
                            
                            // Start the API request
                            const apiRequestPromise = fetchPhrasesFromDeepSeek(category, sourceLang, targetLang);
                            
                            // Also create a way to continue with API data even after timeout
                            apiRequestPromise.then(apiData => {
                                // If we get here, the API responded eventually
                                console.log('API eventually responded successfully');
                                
                                // Save the phrases to the database for future use
                                window.phraseDB.savePhrases(apiData, category)
                                    .then(count => console.log(`Saved ${count} phrases to database`))
                                    .catch(err => console.error('Error saving phrases to database:', err));
                                
                                if (fallbackDataDisplayed && waitingForApiResponse) {
                                    // If fallback data was already displayed but we're still on this category
                                    console.log('Replacing fallback data with actual API response');
                                    phrasesData = apiData;
                                    displayResults(apiData, category);
                                    styleFilterContainer.style.display = 'flex';
                                    loadMoreBtn.style.display = 'block';
                                }
                                waitingForApiResponse = false;
                            }).catch(e => {
                                // This only happens if the API call itself fails (not just times out)
                                console.error('API call failed even after timeout:', e);
                                waitingForApiResponse = false;
                            });
                            
                            // Race the API request against the timeout
                            try {
                                data = await Promise.race([apiRequestPromise, timeoutPromise]);
                                
                                // Save the phrases to the database for future use
                                window.phraseDB.savePhrases(data, category)
                                    .then(count => console.log(`Saved ${count} phrases to database`))
                                    .catch(err => console.error('Error saving phrases to database:', err));
                                
                                waitingForApiResponse = false; // Got data before timeout
                            } catch (timeoutError) {
                                console.error('Error with DeepSeek API, falling back to sample data:', timeoutError);
                                // Fallback till exempeldata
                                data = generateSampleData(category);
                                fallbackDataDisplayed = true;
                                // But keep waitingForApiResponse as true
                            }
                        } catch (apiError) {
                            console.error('Error with DeepSeek API, falling back to sample data:', apiError);
                            // Fallback till exempeldata
                            data = generateSampleData(category);
                            waitingForApiResponse = false; // Don't wait anymore
                        }
                    }
                } catch (dbError) {
                    console.error('Error accessing database:', dbError);
                    // Proceed with API call as fallback
                    try {
                        // Försök att hämta fraser från DeepSeek API med timeout
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('API request timed out')), 40000));
                        
                        const apiRequestPromise = fetchPhrasesFromDeepSeek(category, sourceLang, targetLang);
                        data = await Promise.race([apiRequestPromise, timeoutPromise]);
                        
                        // Save to database if successful
                        window.phraseDB.savePhrases(data, category)
                            .then(count => console.log(`Saved ${count} phrases to database`))
                            .catch(err => console.error('Error saving phrases to database:', err));
                        
                    } catch (apiError) {
                        console.error('Error with DeepSeek API, falling back to sample data:', apiError);
                        // Fallback to sample data
                        data = generateSampleData(category);
                    }
                }
                
                phrasesData = data;
                displayResults(data, category);
                styleFilterContainer.style.display = 'flex';
                loadMoreBtn.style.display = 'block';
            } else {
                // För efterföljande laddningar (offset > 0)
                let newData;
                
                // First, try to get more phrases from the database
                try {
                    // This is a simplified approach - in a real app, you'd need pagination in the DB
                    const allDbPhrases = await window.phraseDB.getPhrasesByCategory(category, sourceLang);
                    
                    // If we have enough phrases in the database, use them
                    if (allDbPhrases && allDbPhrases.length > offset + 3) {
                        newData = allDbPhrases.slice(offset, offset + 3).map(phrase => ({...phrase, fromDatabase: true}));
                        console.log(`Using ${newData.length} more phrases from database for category "${category}"`);
                    } else {
                        // If not enough phrases in database, try the API
                        try {
                            // Försök att få fler fraser från DeepSeek API
                            const timeoutPromise = new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('API request timed out')), 40000));
                            
                            const apiRequestPromise = fetchPhrasesFromDeepSeek(category, sourceLang, targetLang, offset);
                            newData = await Promise.race([apiRequestPromise, timeoutPromise]);
                            
                            // Save the new phrases to the database
                            window.phraseDB.savePhrases(newData, category)
                                .then(count => console.log(`Saved ${count} more phrases to database`))
                                .catch(err => console.error('Error saving more phrases to database:', err));
                            
                        } catch (apiError) {
                            console.error('Error getting more phrases from DeepSeek, using generated variations:', apiError);
                            // Fallback till genererade variationer
                            newData = generateMorePhrases(phrasesData, offset);
                        }
                    }
                } catch (dbError) {
                    console.error('Error accessing database for more phrases:', dbError);
                    // Proceed with API call as fallback
                    try {
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('API request timed out')), 40000));
                        
                        const apiRequestPromise = fetchPhrasesFromDeepSeek(category, sourceLang, targetLang, offset);
                        newData = await Promise.race([apiRequestPromise, timeoutPromise]);
                        
                        // Save to database if successful
                        window.phraseDB.savePhrases(newData, category)
                            .then(count => console.log(`Saved ${count} more phrases to database`))
                            .catch(err => console.error('Error saving more phrases to database:', err));
                        
                    } catch (apiError) {
                        console.error('Error getting more phrases from DeepSeek, using generated variations:', apiError);
                        // Fallback to generated variations
                        newData = generateMorePhrases(phrasesData, offset);
                    }
                }
                
                // Lägg till de nya fraserna
                phrasesData = [...phrasesData, ...newData];
                appendResults(newData);
            }
            
            // Filtrera efter aktuell stil om inte "all"
            if (currentStyle !== 'all') {
                filterPhrasesByStyle(currentStyle);
            }
        } catch (error) {
            console.error('Error fetching phrases:', error);
            // Hide phrases heading, show no-phrases heading
            document.getElementById('phrases-title').style.display = 'none';
            document.getElementById('no-phrases-title').style.display = 'block';
            
            resultsContent.innerHTML = `
                <div class="error-message">
                    <p>There was an error fetching the phrases. Please try again later.</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
    
    // Function to fetch phrases from DeepSeek API
    async function fetchPhrasesFromDeepSeek(category, sourceLang, targetLang, offset = 0) {
        // Build the prompt based on the category and languages
        const prompt = `Generate 3 useful phrases in ${sourceLang} for the category "${category}" with translations to ${targetLang}. 
        For each phrase include:
        1. The phrase in ${sourceLang}
        2. The translation in ${targetLang}
        3. A conversation style (choose one: Casual, Polite, Formal, Direct, Slang, or Enthusiastic)
        4. Word-by-word translation for each important word
        
        Format as a JSON array with this structure:
        [
          {
            "source": "phrase in ${sourceLang}",
            "target": "translation in ${targetLang}",
            "style": "conversation style",
            "lang": "${sourceLang}",
            "words": [
              {"source": "word1", "target": "translation1"},
              {"source": "word2", "target": "translation2"}
            ]
          }
        ]
        
        Do not include any explanation, only return the JSON array.`;
        
        try {
            console.log('Calling DeepSeek API for language:', sourceLang, 'category:', category);
            
            const response = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`DeepSeek API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('DeepSeek API response:', data);
            const content = data.choices[0].message.content;
            
            // Extract JSON from the response
            const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
            if (!jsonMatch) {
                throw new Error('Could not parse JSON from DeepSeek response');
            }
            
            try {
                const phrases = JSON.parse(jsonMatch[0]);
                console.log('Parsed phrases:', phrases);
                return phrases;
            } catch (parseError) {
                console.error('Error parsing JSON from DeepSeek:', parseError);
                throw new Error('Failed to parse phrases from DeepSeek');
            }
        } catch (error) {
            console.error('Error calling DeepSeek API:', error);
            throw error;
        }
    }
    
    // Generate more phrases for the "load more" functionality
    function generateMorePhrases(originalPhrases, offset) {
        // Skapa meningsfulla variationer istället för att bara lägga till text i slutet
        const sourceLang = sourceLanguageSelect.value;
        
        // Variationer för olika språk och kategorier
        const languageVariations = {
            'swedish': {
                'Shopping': [
                    { suffix: '?', prefix: '', style: 'Direct' },
                    { suffix: ', tack.', prefix: '', style: 'Polite' }
                ],
                'Asking for directions': [
                    { suffix: '?', prefix: 'Ursäkta, ', style: 'Polite' },
                    { suffix: '?', prefix: 'Kan du visa mig hur jag kommer till ', style: 'Casual' }
                ],
                'Greetings / small talk': [
                    { suffix: '!', prefix: 'Hej, ', style: 'Enthusiastic' },
                    { suffix: '.', prefix: 'God morgon, ', style: 'Formal' }
                ],
                'default': [
                    { suffix: '?', prefix: 'Kan du ', style: 'Direct' },
                    { suffix: '.', prefix: 'Jag behöver ', style: 'Casual' }
                ]
            },
            'italian': {
                'Shopping': [
                    { suffix: '?', prefix: '', style: 'Direct' },
                    { suffix: ', grazie.', prefix: '', style: 'Polite' }
                ],
                'Asking for directions': [
                    { suffix: '?', prefix: 'Scusi, ', style: 'Polite' },
                    { suffix: '?', prefix: 'Mi può dire come arrivare a ', style: 'Casual' }
                ],
                'Greetings / small talk': [
                    { suffix: '!', prefix: 'Ciao, ', style: 'Enthusiastic' },
                    { suffix: '.', prefix: 'Buongiorno, ', style: 'Formal' }
                ],
                'default': [
                    { suffix: '?', prefix: 'Può ', style: 'Direct' },
                    { suffix: '.', prefix: 'Ho bisogno di ', style: 'Casual' }
                ]
            },
            'default': {
                'default': [
                    { suffix: '?', prefix: '', style: 'Direct' },
                    { suffix: '.', prefix: '', style: 'Casual' }
                ]
            }
        };
        
        // Använd rätt variationer för språket, fallback till default
        const variations = 
            (languageVariations[sourceLang] || languageVariations['default']);
        
        return originalPhrases.map(phrase => {
            // Skapa en kopia av originalfrasen
            const newPhrase = {...phrase};
            
            // Välj variationer baserat på kategori eller använd default
            const categoryVariations = variations[currentCategory] || variations['default'];
            const variationIndex = offset === 3 ? 0 : 1; // Välj variation baserat på offset
            const variation = categoryVariations[variationIndex];
            
            // Ta bort eventuella (variation X) från originalfrasen om de redan finns
            let cleanSource = phrase.source.replace(/\s*\(variation \d+\)\s*\(variation \d+\)\s*$/g, '');
            cleanSource = cleanSource.replace(/\s*\(variation \d+\)\s*$/g, '');
            
            // Skapa ny källfras med prefix och suffix
            newPhrase.source = variation.prefix + cleanSource + variation.suffix;
            
            // Uppdatera även målspråket
            if (phrase.target) {
                let cleanTarget = phrase.target.replace(/\s*\(variation \d+\)\s*\(variation \d+\)\s*$/g, '');
                cleanTarget = cleanTarget.replace(/\s*\(variation \d+\)\s*$/g, '');
                newPhrase.target = variation.prefix + cleanTarget + variation.suffix;
            }
            
            // Uppdatera stilen
            newPhrase.style = variation.style;
            
            // Kopiera och modifiera words-arrayen om den finns
            if (phrase.words && phrase.words.length > 0) {
                newPhrase.words = [...phrase.words];
                
                // Lägg till prefix-ordet om det finns
                if (variation.prefix) {
                    newPhrase.words.unshift({
                        source: variation.prefix.trim(),
                        target: variation.prefix.trim()
                    });
                }
            }
            
            return newPhrase;
        });
    }
    
    // Generate sample data
    function generateSampleData(category) {
        const sourceLang = sourceLanguageSelect.value;
        const targetLang = targetLanguageSelect.value;
        
        // Get phrase based on selected language
        function getSourcePhrase(italianPhrase) {
            // Om vi har en översättning i valt källspråk, använd den
            if (translationData[italianPhrase] && translationData[italianPhrase][sourceLang]) {
                return translationData[italianPhrase][sourceLang];
            }
            
            // Leta efter svensk fras som motsvarar den italienska
            for (const [key, translations] of Object.entries(translationData)) {
                if (translations["italian"] === italianPhrase && translations[sourceLang]) {
                    return translations[sourceLang];
                }
            }
            
            // Fallback om vi inte hittar något
            return italianPhrase;
        }
        
        // Anpassa ordöversättningar för valt språk
        function adaptWordTranslations(wordsArray, sourceLang) {
            // Om källspråket är italienska, behöver vi inte göra något
            if (sourceLang === 'italian') {
                return wordsArray;
            }
            
            // Annars försöker vi översätta orden
            return wordsArray.map(word => {
                // Försök hitta översättningar för källordet
                let translatedSource = word.source;
                
                for (const [phrase, translations] of Object.entries(translationData)) {
                    if (translations['italian'] === word.source && translations[sourceLang]) {
                        translatedSource = translations[sourceLang];
                        break;
                    }
                }
                
                return {
                    source: translatedSource,
                    target: word.target
                };
            });
        }
        
        // Sample data based on category
        const samplePhrases = {
            "Shopping": [
                {
                    source: getSourcePhrase("Quanto costa questo?"),
                    target: getTranslation("Quanto costa questo?", sourceLang, targetLang) || "How much does this cost?",
                    style: "Casual",
                    lang: sourceLang,
                    words: [
                        { source: "Quanto", target: "How much" },
                        { source: "costa", target: "costs" },
                        { source: "questo", target: "this" }
                    ]
                },
                {
                    source: getSourcePhrase("Posso provarlo, per favore?"),
                    target: getTranslation("Posso provarlo, per favore?", sourceLang, targetLang) || "Can I try it on, please?",
                    style: "Polite",
                    lang: sourceLang,
                    words: [
                        { source: "Posso", target: "Can I" },
                        { source: "provarlo", target: "try it" },
                        { source: "per favore", target: "please" }
                    ]
                },
                {
                    source: getSourcePhrase("Accettate carte di credito?"),
                    target: getTranslation("Accettate carte di credito?", sourceLang, targetLang) || "Do you accept credit cards?",
                    style: "Formal",
                    lang: sourceLang,
                    words: [
                        { source: "Accettate", target: "Do you accept" },
                        { source: "carte", target: "cards" },
                        { source: "di credito", target: "credit" }
                    ]
                }
            ],
            // Generic phrases for any category not defined above
            "default": [
                {
                    source: getSourcePhrase("Scusi, può aiutarmi?"),
                    target: getTranslation("Scusi, può aiutarmi?", sourceLang, targetLang) || "Excuse me, can you help me?",
                    style: "Polite",
                    lang: sourceLang,
                    words: [
                        { source: "Scusi", target: "Excuse me" },
                        { source: "può", target: "can you" },
                        { source: "aiutarmi", target: "help me" }
                    ]
                },
                {
                    source: getSourcePhrase("Non capisco."),
                    target: getTranslation("Non capisco.", sourceLang, targetLang) || "I don't understand.",
                    style: "Direct",
                    lang: sourceLang,
                    words: [
                        { source: "Non", target: "don't" },
                        { source: "capisco", target: "understand" }
                    ]
                },
                {
                    source: getSourcePhrase("Grazie mille!"),
                    target: getTranslation("Grazie mille!", sourceLang, targetLang) || "Thank you very much!",
                    style: "Enthusiastic",
                    lang: sourceLang,
                    words: [
                        { source: "Grazie", target: "Thank you" },
                        { source: "mille", target: "a thousand/very much" }
                    ]
                }
            ]
        };
        
        // Generate sample data
        const result = samplePhrases[category] || samplePhrases["default"];
        
        return result.map(phrase => {
            // Get correct translation based on selected language
            const sourcePhrase = getSourcePhrase(phrase.source);
            const targetPhrase = getTranslation(phrase.source, sourceLang, targetLang) || phrase.target;
            
            // Adapt word translations for selected language
            const adaptedWords = adaptWordTranslations(phrase.words, sourceLang);
            
            // Add language code to ensure the right flag is shown
            return {
                ...phrase,
                source: sourcePhrase,
                target: targetPhrase,
                lang: sourceLang,
                words: adaptedWords
            };
        });
    }
    
    // Get translation for a phrase based on source and target languages
    function getTranslation(phrase, sourceLang, targetLang) {
        // If languages are the same, return the original phrase
        if (sourceLang === targetLang) {
            return phrase;
        }
        
        // Try to find direct translation
        if (translationData[phrase] && translationData[phrase][targetLang]) {
            return translationData[phrase][targetLang];
        }
        
        // Try to find phrase in other language keys
        for (const [key, translations] of Object.entries(translationData)) {
            // Om vi hittar frasen som värde i någon språk-nyckel
            for (const [lang, text] of Object.entries(translations)) {
                if (text === phrase && translations[targetLang]) {
                    return translations[targetLang];
                }
            }
        }
        
        // No translation data available
        return null;
    }
    
    // Display results
    function displayResults(phrases, category) {
        // Update title
        const categoryTitle = category ? category.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Select a category';
        document.getElementById('current-category').textContent = categoryTitle;
        
        let html = '';
        
        phrases.forEach(phrase => {
            const isFavorite = favorites.some(fav => fav.source === phrase.source);
            html += createPhraseHTML(phrase, isFavorite);
        });

        resultsContent.innerHTML = html;
        
        // Add event listeners to new elements
        addEventListenersToResults();
    }
    
    // Append more results
    function appendResults(newPhrases) {
        let html = '';
        
        newPhrases.forEach(phrase => {
            const isFavorite = favorites.some(fav => fav.source === phrase.source);
            html += createPhraseHTML(phrase, isFavorite);
        });

        // Append to existing content
        const container = document.createElement('div');
        container.innerHTML = html;
        
        while (container.firstChild) {
            resultsContent.appendChild(container.firstChild);
        }
        
        // Add event listeners to new elements
        addEventListenersToResults();
    }
    
    // Format phrase with words
    function formatPhraseWithWords(phrase) {
        if (!phrase || !phrase.words || phrase.words.length === 0) {
            return phrase && phrase.source ? phrase.source : (typeof phrase === 'string' ? phrase : '');
        }
        
        let formattedPhrase = phrase.source || (typeof phrase === 'string' ? phrase : '');
        const sourceLang = sourceLanguageSelect.value;
        
        // Uppdatera ord-översättningar baserat på källspråk
        if (phrase.words && sourceLang !== 'italian') {
            // Försök att översätta orden baserat på källspråk
            phrase.words.forEach((word, index) => {
                // Uppdatera källord om möjligt
                if (word && word.source && translationData[word.source]) {
                    word.source = translationData[word.source][sourceLang] || word.source;
                }
            });
        }
        
        // Replace each word with an interactive span
        if (phrase.words) {
            phrase.words.forEach((word, index) => {
                if (!word || !word.source) return;
                
                const wordPattern = word.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex characters
                const regex = new RegExp(`\\b${wordPattern}\\b`); // Use without 'g' flag to match first occurrence only
                formattedPhrase = formattedPhrase.replace(
                    regex,
                    `<span class="word" data-word-index="${index}">${word.source}</span>`
                );
            });
        }
        
        return formattedPhrase;
    }
    
    // New function to format target phrase words
    function formatTargetPhraseWithWords(phrase) {
        if (!phrase || !phrase.words || phrase.words.length === 0) {
            return phrase && phrase.target ? phrase.target : (typeof phrase === 'string' ? phrase : '');
        }
        
        let formattedPhrase = phrase.target || (typeof phrase === 'string' ? phrase : '');
        
        // Replace each word with an interactive span for target phrase
        if (phrase.words) {
            phrase.words.forEach((word, index) => {
                if (!word || !word.target) return;
                
                const wordPattern = word.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex characters
                const regex = new RegExp(`\\b${wordPattern}\\b`); // Use without 'g' flag to match first occurrence only
                formattedPhrase = formattedPhrase.replace(
                    regex,
                    `<span class="target-word" data-word-index="${index}">${word.target}</span>`
                );
            });
        }
        
        return formattedPhrase;
    }
    
    // Create HTML for a phrase
    function createPhraseHTML(phrase, isFavorite) {
        const favoriteClass = isFavorite ? 'active' : '';
        const styleTag = phrase.style ? `<span class="style-description">Style: ${phrase.style}</span>` : '';
        
        // Add a 'db' indicator if the phrase was loaded from database
        const dbIndicator = phrase.fromDatabase ? `<span class="db-indicator">FROM DB</span>` : '';
        
        const userName = (onboardingData && onboardingData.name) ? onboardingData.name : 'Friend';

        // Generate a client-side ID if not provided by the API
        const phraseId = phrase.id || `csid_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
        
        // Use phrase.lang for source language, and selected target language for target
        const sourceLangDisplay = (phrase.lang && languageData[phrase.lang]) 
            ? languageData[phrase.lang].name 
            : (languageData[sourceLanguageSelect.value]?.name || 'Source');
        const targetLangDisplay = languageData[targetLanguageSelect.value]?.name || 'Target';

        // Initialize with defaults to prevent undefined
        let sourcePhraseText = phrase.source || ''; 
        let targetPhraseText = phrase.target || '';

        if (userName) {
            const namePlaceholder = /\[name\]/gi; // Case-insensitive global regex to find [name]
            sourcePhraseText = sourcePhraseText.replace(namePlaceholder, userName);
            targetPhraseText = targetPhraseText.replace(namePlaceholder, userName);
        }

        // Update phrase object with processed text for formatPhraseWithWords
        const phraseForFormatting = {
            ...phrase,
            source: sourcePhraseText,
            target: targetPhraseText
        };

        // Generate formatted HTML with interactive words
        const formattedSourcePhrase = formatPhraseWithWords(phraseForFormatting);
        const formattedTargetPhrase = formatTargetPhraseWithWords(phraseForFormatting);

        return `
            <div class="phrase-container" data-id="${phraseId}" data-style="${phrase.style || ''}">
                ${dbIndicator}
                <div class="phrase-content">
                    <div class="phrase-header">
                        <p class="source-language-label">${sourceLangDisplay}</p>
                        <p class="target-language-label">${targetLangDisplay}</p>
                    </div>
                    <p class="source-phrase">${formattedSourcePhrase}</p>
                    <p class="target-phrase">${formattedTargetPhrase}</p>
                    ${styleTag}
                    <div class="phrase-explanation" style="display: none;">
                        <div class="explanation-loading">
                            <div class="spinner small-spinner"></div>
                            <span>Generating explanation...</span>
                        </div>
                        <div class="explanation-content"></div>
                    </div>
                </div>
                <div class="phrase-actions">
                    <button class="favorite-btn ${favoriteClass}" aria-label="Favorite phrase">
                        <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    </button>
                    <button class="audio-btn" aria-label="Play audio for phrase">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    </button>
                    <button class="explain-btn" aria-label="Explain this phrase">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </button>
                </div>
            </div>
        `;
    }
    
    // Add event listeners to the results
    function addEventListenersToResults() {
        // Audio buttons
        document.querySelectorAll('.audio-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const phraseContainer = this.closest('.phrase-container');
                const sourcePhrase = phraseContainer.querySelector('.source-phrase').textContent.trim();
                speakText(sourcePhrase);
            });
        });
        
        // Explain buttons
        document.querySelectorAll('.explain-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const phraseContainer = this.closest('.phrase-container');
                const phraseId = phraseContainer.getAttribute('data-id');
                const sourcePhrase = phraseContainer.querySelector('.source-phrase').textContent.trim();
                const targetPhrase = phraseContainer.querySelector('.target-phrase').textContent.trim();
                const explanationDiv = phraseContainer.querySelector('.phrase-explanation');
                const explanationContent = explanationDiv.querySelector('.explanation-content');
                
                // Toggle explanation visibility
                if (explanationDiv.style.display === 'none') {
                    // Show explanation section with loading indicator
                    explanationDiv.style.display = 'block';
                    explanationDiv.querySelector('.explanation-loading').style.display = 'flex';
                    explanationContent.style.display = 'none';
                    
                    // Get explanation if it doesn't exist yet
                    if (!explanationContent.innerHTML) {
                        generatePhraseExplanation(sourcePhrase, targetPhrase)
                            .then(explanation => {
                                explanationContent.innerHTML = explanation;
                                explanationDiv.querySelector('.explanation-loading').style.display = 'none';
                                explanationContent.style.display = 'block';
                            })
                            .catch(error => {
                                explanationContent.innerHTML = `<p class="error">Sorry, couldn't generate explanation: ${error.message}</p>`;
                                explanationDiv.querySelector('.explanation-loading').style.display = 'none';
                                explanationContent.style.display = 'block';
                            });
                    } else {
                        // If we already have the explanation, just show it
                        explanationDiv.querySelector('.explanation-loading').style.display = 'none';
                        explanationContent.style.display = 'block';
                    }
                } else {
                    // Hide explanation
                    explanationDiv.style.display = 'none';
                }
            });
        });
        
        // Favorite buttons
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const phraseContainer = this.closest('.phrase-container');
                const phraseId = phraseContainer.getAttribute('data-id');
                const sourcePhrase = phraseContainer.querySelector('.source-phrase').textContent.trim();
                const targetPhrase = phraseContainer.querySelector('.target-phrase').textContent.trim();
                const style = phraseContainer.getAttribute('data-style');
                
                // Check if this phrase is already in favorites
                const index = favorites.findIndex(fav => fav.id === phraseId);
                
                if (index === -1) {
                    // Add to favorites
                    const phraseData = {
                        id: phraseId,
                        sourcePhrase: sourcePhrase,
                        targetPhrase: targetPhrase,
                        style: style
                    };
                    favorites.push(phraseData);
                    
                    // Update button appearance
                    btn.classList.add('active');
                    const iconElement = btn.querySelector('i');
                    if (iconElement) {
                        iconElement.classList.remove('ph-star');
                        iconElement.classList.add('ph-star-fill');
                        iconElement.style.fill = '#ffc107';
                    }
                } else {
                    // Remove from favorites
                    favorites.splice(index, 1);
                    
                    // Update button appearance
                    btn.classList.remove('active');
                    const iconElement = btn.querySelector('i');
                    if (iconElement) {
                        iconElement.classList.remove('ph-star-fill');
                        iconElement.classList.add('ph-star');
                        iconElement.style.fill = '';
                    }
                }
                
                // Save to localStorage
                localStorage.setItem('phrasesFavorites', JSON.stringify(favorites));
                
                // If we're in the favorites view, reload favorites
                if (document.querySelector('.favorites-container').style.display === 'block') {
                    loadFavorites();
                }
            });
        });
        
        // Word hover and click events
        document.querySelectorAll('.word').forEach(word => {
            // Click to hear pronunciation
            word.addEventListener('click', function() {
                // Get only the word text without any child elements
                const text = this.textContent;
                speakText(text);
            });
            
            // Mouse events for highlighting corresponding target words
            word.addEventListener('mouseenter', function() {
                const wordIndex = this.getAttribute('data-word-index');
                const container = this.closest('.phrase-container');
                
                // Find and highlight corresponding target word
                const targetWord = container.querySelector(`.target-word[data-word-index="${wordIndex}"]`);
                if (targetWord) {
                    targetWord.classList.add('highlight');
                }
            });
            
            word.addEventListener('mouseleave', function() {
                const wordIndex = this.getAttribute('data-word-index');
                const container = this.closest('.phrase-container');
                
                // Remove highlight from target word
                const targetWord = container.querySelector(`.target-word[data-word-index="${wordIndex}"]`);
                if (targetWord) {
                    targetWord.classList.remove('highlight');
                }
            });
        });
        
        // Add same events for target words to highlight source words
        document.querySelectorAll('.target-word').forEach(targetWord => {
            targetWord.addEventListener('mouseenter', function() {
                const wordIndex = this.getAttribute('data-word-index');
                const container = this.closest('.phrase-container');
                
                // Find and highlight corresponding source word
                const sourceWord = container.querySelector(`.word[data-word-index="${wordIndex}"]`);
                if (sourceWord) {
                    sourceWord.style.backgroundColor = 'var(--primary-light)';
                }
            });
            
            targetWord.addEventListener('mouseleave', function() {
                const wordIndex = this.getAttribute('data-word-index');
                const container = this.closest('.phrase-container');
                
                // Remove highlight from source word
                const sourceWord = container.querySelector(`.word[data-word-index="${wordIndex}"]`);
                if (sourceWord) {
                    sourceWord.style.backgroundColor = 'transparent';
                }
            });
        });
    }
    
    // Text-to-speech function
    function speakText(text) {
        if (!audioContext) {
            initAudioContext();
        }
        
        // Try to determine the language from the active phrase container
        let phraseLang = sourceLanguageSelect.value;
        const activeBtn = document.activeElement;
        if (activeBtn && activeBtn.classList.contains('audio-btn')) {
            const phraseContainer = activeBtn.closest('.phrase-container');
            if (phraseContainer) {
                const sourcePhraseElem = phraseContainer.querySelector('.source-phrase');
                if (sourcePhraseElem) {
                    const flagText = sourcePhraseElem.textContent.trim().slice(0, 4); // Get the flag emoji part
                    
                    // Map flag to language code
                    for (const [lang, data] of Object.entries(languageData)) {
                        if (flagText.includes(data.flag)) {
                            phraseLang = lang;
                            break;
                        }
                    }
                }
            }
        }
        
        // Language codes for TTS
        const langCodes = {
            'italian': 'it-IT',
            'french': 'fr-FR',
            'spanish': 'es-ES',
            'german': 'de-DE',
            'portuguese': 'pt-PT',
            'polish': 'pl-PL',
            'swedish': 'sv-SE',
            'english': 'en-GB'
        };
        
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        // Use Web Speech API for TTS
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCodes[phraseLang];
        utterance.rate = 0.9;  // Slightly slower for learning
        utterance.pitch = 1.0; // Normal pitch
        utterance.volume = 1.0; // Full volume
        
        // Try to find a good voice for the language
        const voices = window.speechSynthesis.getVoices();
        const languageVoices = voices.filter(voice => voice.lang.startsWith(langCodes[phraseLang].split('-')[0]));
        
        // Prefer natural-sounding voices if available
        const naturalVoice = languageVoices.find(voice => !voice.localService);
        if (naturalVoice) {
            utterance.voice = naturalVoice;
        } else if (languageVoices.length > 0) {
            utterance.voice = languageVoices[0];
        }
        
        window.speechSynthesis.speak(utterance);
    }
    
    // Ensure voices are loaded
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = function() {
            console.log("Voices loaded:", window.speechSynthesis.getVoices().length);
        };
    }
    
    // Filter phrases by style
    function filterPhrasesByStyle(style) {
        const phraseContainers = document.querySelectorAll('.phrase-container');
        
        if (style === 'all') {
            // Show all phrases
            phraseContainers.forEach(container => {
                container.style.display = 'flex';
            });
        } else {
            // Filter by style
            phraseContainers.forEach(container => {
                const phraseStyle = container.getAttribute('data-style');
                container.style.display = phraseStyle === style ? 'flex' : 'none';
            });
        }
    }
    
    // Reset style filters
    function resetStyleFilters() {
        styleFilterBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-style') === 'all') {
                btn.classList.add('active');
            }
        });
    }

    // Function to generate explanation for a phrase
    async function generatePhraseExplanation(sourcePhrase, targetPhrase) {
        try {
            const sourceLang = sourceLanguageSelect.value;
            const targetLang = targetLanguageSelect.value;
            
            // First, check if we have this explanation in the database
            try {
                const dbExplanation = await window.phraseDB.getExplanation(sourcePhrase, sourceLang, targetLang);
                
                if (dbExplanation) {
                    console.log('Found explanation in database, using cached version');
                    return dbExplanation.explanation;
                }
                
                console.log('No explanation found in database, generating new one');
            } catch (dbError) {
                console.error('Error checking database for explanation:', dbError);
                // Continue to generate a new explanation
            }
            
            // Get learning style from onboarding data to adapt explanation style
            const learningStyle = onboardingData?.learningStyle || 'deep';
            const proficiency = onboardingData?.proficiency || 'beginner';
            
            // Build prompt for the explanation
            const prompt = `Explain the grammar and structure of this phrase for a ${proficiency} language learner who prefers a ${learningStyle} learning style:
            
            Source phrase (${sourceLang}): "${sourcePhrase}"
            Target phrase (${targetLang}): "${targetPhrase}"
            
            Please provide:
            1. A brief grammatical breakdown
            2. Key vocabulary and their usage
            3. Cultural context or usage notes if relevant
            
            Format the explanation in simple HTML (only use p, ul, li, em, strong tags). 
            If the learning style is "deep", provide more detailed grammar explanations.
            If the learning style is "playful", use more examples and fun comparisons.
            If the learning style is "fast", keep it concise and practical.
            
            Explain in ${targetLang}.`;
            
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Explanation generation timed out')), 40000));
            
            // Create the API request promise
            const apiRequestPromise = fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 800
                })
            }).then(async response => {
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`DeepSeek API error: ${errorData.error?.message || response.statusText}`);
                }
                
                const data = await response.json();
                const explanation = data.choices[0].message.content;
                
                // Save explanation to database for future use
                try {
                    await window.phraseDB.saveExplanation(
                        sourcePhrase,
                        targetPhrase,
                        explanation,
                        sourceLang,
                        targetLang
                    );
                    console.log('Saved explanation to database');
                } catch (saveError) {
                    console.error('Error saving explanation to database:', saveError);
                    // Continue even if saving fails
                }
                
                return explanation;
            });
            
            // Race the API request against the timeout
            return await Promise.race([apiRequestPromise, timeoutPromise]);
            
        } catch (error) {
            console.error('Error generating phrase explanation:', error);
            
            // Provide a simple fallback explanation if timeout or other error
            if (error.message.includes('timed out')) {
                return `<p>Sorry, the explanation is taking longer than expected to generate. The API request timed out.</p>
                <p>Here's a simple explanation instead:</p>
                <ul>
                    <li>The phrase in ${sourceLanguageSelect.value} is: <strong>${sourcePhrase}</strong></li>
                    <li>It translates to ${targetLanguageSelect.value} as: <strong>${targetPhrase}</strong></li>
                </ul>
                <p>Try clicking the explain button again if you'd like a more detailed explanation.</p>`;
            }
            
            throw error;
        }
    }
});
