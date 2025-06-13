document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded - main.js running');

    // Initialize Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDG_GCVLfLYzIepcIi_BnuemIVfLccMPWg",
        authDomain: "ignitexyz-f459f.firebaseapp.com",
        projectId: "ignitexyz-f459f",
        storageBucket: "ignitexyz-f459f.firebasestorage.app",
        messagingSenderId: "631548240313",
        appId: "1:631548240313:web:f0896c75166336de805668"
    };

    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Header Setup
    const header = document.querySelector('header');
    const headerHeight = header ? header.offsetHeight : 0;
    let headerTranslateY = 0;
    const maxHeaderTranslate = headerHeight;
    const minHeaderTranslate = 0;

    function updateHeaderPosition(translateY) {
        headerTranslateY = Math.max(-maxHeaderTranslate, Math.min(minHeaderTranslate, translateY));
        if (header) header.style.transform = `translateY(${headerTranslateY}px)`;
    }

    function handleContainerScroll(container) {
        if (!container) return;
        container.addEventListener('wheel', (e) => {
            const deltaY = e.deltaY;
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            const atTop = scrollTop <= 0;
            const atBottom = Math.abs(scrollTop + clientHeight - scrollHeight) < 1;

            if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
                e.preventDefault();
                const scrollSpeed = 0.5;
                const newTranslateY = Math.max(-maxHeaderTranslate, Math.min(minHeaderTranslate, headerTranslateY - deltaY * scrollSpeed));
                updateHeaderPosition(newTranslateY);
            }
        }, { passive: false });
    }

    ['.container1', '.container2', '.container3'].forEach(selector => {
        const container = document.querySelector(selector);
        if (container) handleContainerScroll(container);
    });

    window.showContainer3 = function(section) {
        const sections = document.querySelectorAll('.container3-section');
        sections.forEach(sec => sec.style.display = 'none');
        const targetSection = document.getElementById(`${section}-section`);
        if (targetSection) targetSection.style.display = 'block';

        const tasksTab = document.getElementById('tasks-tab');
        const referralsTab = document.getElementById('referrals-tab');
        if (tasksTab && referralsTab) {
            tasksTab.classList.toggle('active', section === 'tasks');
            referralsTab.classList.toggle('active', section === 'referrals');
        }
    };

    if (document.querySelector('.container3')) showContainer3('tasks');

    window.showContainer = function(section) {
        const sections = document.querySelectorAll('.container-section');
        sections.forEach(sec => sec.style.display = 'none');
        const targetSection = document.getElementById(section);
        if (targetSection) targetSection.style.display = 'block';
    };

    // New Feature: Check for registered user and show profile
    const showProfileForRegisteredUser = async () => {
        const registeredEmail = localStorage.getItem('registeredEmail');
        const container2 = document.querySelector('.container2');
        if (!container2) return;

        if (registeredEmail) {
            sessionStorage.setItem('currentWaitlistEmail', registeredEmail); // Sync with sessionStorage
            const waitlist = await getWaitlist();
            const entry = waitlist.find(e => e.email === registeredEmail);

            if (entry) {
                // Show profile container
                showContainer('profile-container');

                // Populate profile details
                const spans = {
                    displayEmail: document.getElementById('displayEmail'),
                    displaySolanaWallet: document.getElementById('displaySolanaWallet'),
                    displayReferralCode: document.getElementById('displayReferralCode'),
                    userrefcount: document.getElementById('userrefcount')
                };

                if (spans.displayEmail) spans.displayEmail.textContent = entry.email || 'Not provided';
                if (spans.displaySolanaWallet) spans.displaySolanaWallet.textContent = formatSolanaWallet(entry.solanaWallet);
                if (spans.displayReferralCode) spans.displayReferralCode.textContent = entry.refLink || 'Not provided';
                if (spans.userrefcount) spans.userrefcount.textContent = entry.referrals || '0';

                // Setup copy referral button
                const copyReferralButton = document.getElementById('copyReferralButton');
                if (copyReferralButton) {
                    copyReferralButton.addEventListener('click', () => {
                        const refLink = spans.displayReferralCode?.textContent || '';
                        if (refLink && refLink !== 'Not provided') {
                            navigator.clipboard.writeText(refLink)
                                .then(() => alert('Referral link copied!'))
                                .catch(() => alert('Failed to copy link.'));
                        } else {
                            alert('No referral link available.');
                        }
                    });
                }

                // Hide registration container
                const containers = document.querySelectorAll('.container');
                if (containers.length >= 2) {
                    containers[0].style.display = 'none';
                    containers[1].style.display = 'block';
                }
            } else {
                // If email not found in waitlist, clear localStorage and show registration
                localStorage.removeItem('registeredEmail');
                showContainer('register');
            }
        } else {
            showContainer('register');
        }
    };

    // Call the function to check for registered user on page load
    showProfileForRegisteredUser();

    const urlParams = new URLSearchParams(window.location.search);
    const inviteCodeFromUrl = urlParams.get('ref');
    const inviteCodeInput = document.getElementById('inviteCode');
    if (inviteCodeFromUrl && inviteCodeInput) {
        inviteCodeInput.value = inviteCodeFromUrl;
    }

    // Firestore Helpers
    const getUsers = async () => {
        try {
            const snapshot = await db.collection('users').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Failed to fetch users:', error);
            return [];
        }
    };

    const saveUser = async (user) => {
        try {
            await db.collection('users').doc(user.email).set(user, { merge: true });
            return true;
        } catch (error) {
            console.error('Failed to save user:', error);
            return false;
        }
    };

    const getUserByEmail = async (email) => {
        try {
            const doc = await db.collection('users').doc(email).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (error) {
            console.error('Failed to fetch user:', error);
            return null;
        }
    };

    const getCurrentUser = async () => {
        const email = sessionStorage.getItem('currentUserEmail');
        return email ? await getUserByEmail(email) : null;
    };

    const updateUser = async (updatedUser) => {
        try {
            await db.collection('users').doc(updatedUser.email).set(updatedUser, { merge: true });
            return true;
        } catch (error) {
            console.error('Failed to update user:', error);
            return false;
        }
    };

    const getWaitlist = async () => {
        try {
            const snapshot = await db.collection('waitlist').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Failed to fetch waitlist:', error);
            return [];
        }
    };

    const saveWaitlistEntry = async (entry) => {
        try {
            if (!entry.email || typeof entry.email !== 'string' || entry.email.includes('/')) {
                console.error('Invalid email for waitlist entry:', entry.email);
                alert('Invalid email format.');
                return false;
            }
            console.log('Attempting to save waitlist entry:', entry);
            await db.collection('waitlist').doc(entry.email).set(entry, { merge: true });
            console.log('Waitlist entry saved successfully for:', entry.email);
            return true;
        } catch (error) {
            console.error('Failed to save waitlist entry:', {
                errorMessage: error.message,
                errorCode: error.code,
                entry
            });
            alert(`Failed to save waitlist: ${error.message}`);
            return false;
        }
    };

    const generateReferralCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    const formatSolanaWallet = (wallet) => {
        if (!wallet || wallet.length < 12) return 'Invalid Wallet';
        return `${wallet.slice(0, 6)}***${wallet.slice(-6)}`;
    };

    const calculatePosition = async (currentUser) => {
        const users = await getUsers();
        if (!users.length || !currentUser) return 1;
        return [...users].sort((a, b) => (b.points || 0) - (a.points || 0)).findIndex(u => u.email === currentUser.email) + 1;
    };

    const getWalletData = async (walletAddress) => {
        try {
            const doc = await db.collection('walletData').doc(walletAddress).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error(`Failed to fetch walletData for ${walletAddress}:`, error);
            return null;
        }
    };

    const saveWalletData = async (walletAddress, data) => {
        try {
            await db.collection('walletData').doc(walletAddress).set(data, { merge: true });
            sessionStorage.setItem('walletData', JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Failed to save walletData for ${walletAddress}:`, error);
            alert('Storage error.');
            return false;
        }
    };

    // Referral System: Increment Referrer's Count
    const incrementReferrerCount = async (refCode) => {
        try {
            const waitlist = await getWaitlist();
            const referrer = waitlist.find(entry => entry.refCode === refCode);
            if (referrer) {
                const updatedReferrals = (referrer.referrals || 0) + 1;
                await db.collection('waitlist').doc(referrer.email).update({ referrals: updatedReferrals });
                console.log(`Referrer ${referrer.email} referral count incremented to ${updatedReferrals}`);
            }
        } catch (error) {
            console.error('Failed to increment referrer count:', error);
        }
    };

    // Register Form (Original Registration)
    const registerFormOriginal = document.getElementById('registerForm');
    if (registerFormOriginal && registerFormOriginal.querySelector('#solanaWallet')) {
        const emailInput = document.getElementById('email');
        const solanaWalletInput = document.getElementById('solanaWallet');
        const termsCheckbox = document.getElementById('termsCheckbox');
        const joinButton = document.getElementById('joinButton');
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = 'color: red; font-size: 12px; margin-top: 5px; text-align: center';
        registerFormOriginal.appendChild(errorMessage);

        if (!emailInput || !solanaWalletInput || !termsCheckbox || !joinButton) {
            console.error('Register form elements missing');
            return;
        }

        // Check if user is already registered
        if (localStorage.getItem('registeredEmail')) {
            // Disable the registration form
            emailInput.disabled = true;
            solanaWalletInput.disabled = true;
            termsCheckbox.disabled = true;
            joinButton.disabled = true;
            joinButton.classList.add('disabled');
            errorMessage.textContent = 'You are already registered. Please view your profile.';
            return;
        }

        const validationRules = {
            email: { test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()), message: 'Invalid email.' },
            solanaWallet: { test: (value) => value.trim().length >= 32, message: 'Invalid Solana wallet (32+ chars).' },
            terms: { test: () => termsCheckbox.checked, message: 'You must agree to terms.' }
        };

        const validateForm = () => {
            const isValid = Object.keys(validationRules).every(rule =>
                validationRules[rule].test(rule === 'terms' ? null : document.getElementById(rule).value)
            );
            joinButton.disabled = !isValid;
            joinButton.classList.toggle('disabled', !isValid);
        };

        const showError = (inputId) => {
            errorMessage.textContent = inputId in validationRules && !validationRules[inputId].test(inputId === 'terms' ? null : document.getElementById(inputId).value)
                ? validationRules[inputId].message
                : '';
        };

        [emailInput, solanaWalletInput].forEach(input => {
            input.addEventListener('input', () => { validateForm(); if (document.activeElement === input) showError(input.id); });
            input.addEventListener('focus', () => showError(input.id));
            input.addEventListener('blur', () => errorMessage.textContent = '');
        });

        termsCheckbox.addEventListener('change', () => { validateForm(); showError('terms'); });
        termsCheckbox.addEventListener('focus', () => showError('terms'));
        termsCheckbox.addEventListener('blur', () => errorMessage.textContent = '');

        validateForm();

        registerFormOriginal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const solanaWallet = solanaWalletInput.value.trim();

            // Double-check localStorage
            if (localStorage.getItem('registeredEmail')) {
                alert('You are already registered on this device.');
                return;
            }

            const waitlist = await getWaitlist();
            if (waitlist.some(entry => entry.email === email)) {
                alert('Email already registered.');
                return;
            }

            const refCode = generateReferralCode();
            const refLink = `https://ignite-xyz.vercel.app/?ref=${refCode}`;

            const newEntry = {
                email,
                solanaWallet,
                refCode,
                refLink,
                joinedAt: Date.now(),
                referrals: 0
            };

            const success = await saveWaitlistEntry(newEntry);
            if (!success) return;

            if (inviteCodeFromUrl) {
                await incrementReferrerCount(inviteCodeFromUrl);
            }

            // Save to localStorage to persist registration
            localStorage.setItem('registeredEmail', email);
            sessionStorage.setItem('currentWaitlistEmail', email);

            emailInput.value = '';
            solanaWalletInput.value = '';
            termsCheckbox.checked = false;
            validateForm();

            // Show profile immediately
            await showProfileForRegisteredUser();

            // Redirect to waitv.html
            window.location.href = 'waitv.html';
        });
    }

    // New Email Check Form Logic (Disabled for Registered Users)
    const registerForm = document.getElementById('registerForm');
    if (registerForm && !registerForm.querySelector('#solanaWallet')) {
        const emailInput = document.getElementById('email');
        const joinButton = document.getElementById('joinButton');
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = 'color: red; font-size: 12px; margin-top: 5px; text-align: center';
        registerForm.appendChild(errorMessage);

        if (!emailInput || !joinButton) {
            console.error('Email check form elements missing');
            return;
        }

        // Check if user is already registered
        if (localStorage.getItem('registeredEmail')) {
            emailInput.disabled = true;
            joinButton.disabled = true;
            joinButton.classList.add('disabled');
            errorMessage.textContent = 'You are already registered. Please view your profile.';
            return;
        }

        const validateForm = () => {
            const email = emailInput.value.trim();
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            joinButton.disabled = !isValid;
            joinButton.classList.toggle('disabled', !isValid);
            errorMessage.textContent = isValid ? '' : 'Invalid email.';
        };

        emailInput.addEventListener('input', validateForm);
        emailInput.addEventListener('focus', () => {
            errorMessage.textContent = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim()) ? '' : 'Invalid email.';
        });
        emailInput.addEventListener('blur', () => { errorMessage.textContent = ''; });

        validateForm();

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const waitlist = await getWaitlist();
            const entry = waitlist.find(e => e.email === email);

            if (entry) {
                // Save to localStorage to persist registration
                localStorage.setItem('registeredEmail', email);
                sessionStorage.setItem('currentWaitlistEmail', email);
                // Show profile immediately
                await showProfileForRegisteredUser();
            } else {
                // Show popup
                const popup = document.createElement('div');
                popup.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000';
                const content = document.createElement('div');
                content.style.cssText = 'background: #fff; padding: 20px; border-radius: 5px; text-align: center; max-width: 400px';
                content.innerHTML = '<p>Email not registered.</p><button type="button" style="padding: 10px 20px; cursor: pointer;">Close</button>';
                content.querySelector('button').addEventListener('click', () => popup.remove());
                popup.appendChild(content);
                popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
                document.body.appendChild(popup);
            }
        });
    }

    // Waitlist Display on waitv.html
    if (window.location.pathname.includes('waitv.html')) {
        (async () => {
            const email = localStorage.getItem('registeredEmail') || sessionStorage.getItem('currentWaitlistEmail');
            if (!email) {
                alert('Please register to view profile.');
                window.location.href = 'index.html';
                return;
            }

            sessionStorage.setItem('currentWaitlistEmail', email); // Sync with sessionStorage
            const waitlist = await getWaitlist();
            const entry = waitlist.find(e => e.email === email);
            if (!entry) {
                alert('No waitlist data found.');
                localStorage.removeItem('registeredEmail');
                window.location.href = 'index.html';
                return;
            }

            const spans = {
                displayEmail: document.getElementById('displayEmail'),
                displaySolanaWallet: document.getElementById('displaySolanaWallet'),
                displayRefCode: document.getElementById('displayRefCode'),
                displayReferralCode: document.getElementById('displayReferralCode'),
                userrefcount: document.getElementById('userrefcount')
            };

            if (spans.displayEmail) spans.displayEmail.textContent = entry.email || 'Not provided';
            if (spans.displaySolanaWallet) spans.displaySolanaWallet.textContent = formatSolanaWallet(entry.solanaWallet);
            if (spans.displayRefCode) spans.displayRefCode.textContent = entry.refCode || 'Not provided';
            if (spans.displayReferralCode) spans.displayReferralCode.textContent = entry.refLink || 'Not provided';
            if (spans.userrefcount) spans.userrefcount.textContent = entry.referrals || '0';

            const copyReferralButton = document.getElementById('copyReferralButton');
            if (copyReferralButton) {
                copyReferralButton.addEventListener('click', () => {
                    const refLink = spans.displayReferralCode?.textContent || '';
                    if (refLink && refLink !== 'Not provided') {
                        navigator.clipboard.writeText(refLink)
                            .then(() => alert('Referral link copied!'))
                            .catch(() => alert('Failed to copy link.'));
                    } else {
                        alert('No referral link available.');
                    }
                });
            }
        })();
    }

    // Login Form (Removed since no logout button)
    // Note: Login form section is preserved but not functional since there's no logout

    // Profile Page
    const profileSpans = {
        displayEmail: document.getElementById('displayEmail'),
        displaySolanaWallet: document.getElementById('displaySolanaWallet'),
        displayTwitter: document.getElementById('displayTwitter')
    };
    if (Object.values(profileSpans).some(span => span)) {
        (async () => {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                if (profileSpans.displayEmail) profileSpans.displayEmail.textContent = currentUser.email || 'Not provided';
                if (profileSpans.displaySolanaWallet) profileSpans.displaySolanaWallet.textContent = formatSolanaWallet(currentUser.solana_wallet);
                if (profileSpans.displayTwitter) profileSpans.displayTwitter.textContent = currentUser.twitter || 'Not provided';
            }
        })();
    }

    // Dashboard
    const dashboardSpans = {
        displayPoints: document.getElementById('displayPoints'),
        displayPosition: document.getElementById('displayPosition'),
        displayReferrals: document.getElementById('displayReferrals'),
        displayReferralCode: document.getElementById('displayReferralCode')
    };
    if (Object.values(dashboardSpans).some(span => span)) {
        (async () => {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                dashboardSpans.displayPoints.textContent = currentUser.points || '0';
                dashboardSpans.displayPosition.textContent = `#${await calculatePosition(currentUser)}`;
                dashboardSpans.displayReferrals.textContent = currentUser.referrals || '0';
                dashboardSpans.displayReferralCode.textContent = currentUser.referral_link || 'Not provided';

                const getTasks = async () => {
                    try {
                        const snapshot = await db.collection('tasks').get();
                        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    } catch (error) {
                        console.error('Failed to fetch tasks:', error);
                        return [];
                    }
                };

                const saveTask = async (task) => {
                    try {
                        await db.collection('tasks').doc(`${task.user_email}_${task.task_key}`).set(task, { merge: true });
                        return true;
                    } catch (error) {
                        console.error('Failed to save task:', error);
                        return false;
                    }
                };

                const tasks = [
                    { taskId: 'twitterTask', claimId: 'twitterClaim', key: 'twitterTaskCompleted' },
                    { taskId: 'telegramTask', claimId: 'telegramClaim', key: 'telegramTaskCompleted' },
                    { taskId: 'telegram2Task', claimId: 'telegram2Claim', key: 'telegram2TaskCompleted' },
                    { taskId: 'discordTask', claimId: 'discordClaim', key: 'discordTaskCompleted' }
                ];

                for (const task of tasks) {
                    const taskButton = document.getElementById(task.taskId);
                    const claimButton = document.getElementById(task.claimId);
                    if (!taskButton || !claimButton) continue;

                    let taskCompleted = false;
                    let taskClaimed = false;
                    const allTasks = await getTasks();
                    const userTask = allTasks.find(t => t.user_email === currentUser.email && t.task_key === task.key);
                    if (userTask) {
                        taskCompleted = userTask.completed || false;
                        taskClaimed = userTask.claimed || false;
                    }

                    if (taskClaimed) {
                        claimButton.textContent = 'Claimed';
                        claimButton.classList.add('disabled');
                        claimButton.disabled = true;
                    } else if (taskCompleted) {
                        claimButton.classList.remove('disabled');
                        claimButton.disabled = false;
                    }

                    taskButton.addEventListener('click', async () => {
                        const allTasks = await getTasks();
                        const taskIndex = allTasks.findIndex(t => t.user_email === currentUser.email && t.task_key === task.key);
                        if (taskIndex !== -1) allTasks[taskIndex].completed = true;
                        else allTasks.push({ user_email: currentUser.email, task_key: task.key, completed: true, claimed: false });
                        await saveTask(allTasks[taskIndex] || allTasks[allTasks.length - 1]);
                        claimButton.classList.remove('disabled');
                        claimButton.disabled = false;
                    });

                    claimButton.addEventListener('click', async () => {
                        if (taskClaimed) return;
                        currentUser.points = (currentUser.points || 0) + 10;
                        if (await updateUser(currentUser)) {
                            const allTasks = await getTasks();
                            const taskIndex = allTasks.findIndex(t => t.user_email === currentUser.email && t.task_key === task.key);
                            if (taskIndex !== -1) {
                                allTasks[taskIndex].claimed = true;
                                await saveTask(allTasks[taskIndex]);
                            }
                            dashboardSpans.displayPoints.textContent = currentUser.points;
                            dashboardSpans.displayPosition.textContent = `#${await calculatePosition(currentUser)}`;
                            claimButton.textContent = 'Claimed';
                            claimButton.classList.add('disabled');
                            claimButton.disabled = true;
                        } else {
                            alert('Failed to claim points.');
                        }
                    });
                }

                const copyReferralButton = document.getElementById('copyReferralButton');
                if (copyReferralButton) {
                    copyReferralButton.addEventListener('click', () => {
                        const refLink = currentUser.referral_link || '';
                        if (refLink) {
                            navigator.clipboard.writeText(refLink)
                                .then(() => alert('Referral link copied!'))
                                .catch(() => alert('Failed to copy link.'));
                        } else {
                            alert('No referral link available.');
                        }
                    });
                }
            }
        })();
    }

    // Remove Logout Functionality (No logout button)
    // Note: Logout section is preserved but not functional

    // Solana Wallet (Preserved)
    const connectWalletButton = document.getElementById('connectWalletButton');
    const ALCHEMY_API_KEY = 'Pa-0rKKFoqNVZ36Z0WH1A1f1ZSatjRBA';
    const ALCHEMY_API_URL = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

    function formatNumber(value) {
        if (value >= 10) return Math.floor(value).toString();
        if (value >= 1) return value.toFixed(1);
        if (value >= 0.1) return value.toFixed(2);
        if (value >= 0.01) return value.toFixed(3);
        if (value >= 0.001) return value.toFixed(4);
        return value.toFixed(5);
    }

    function animateCount(element, target, duration, isWalletAgeOrTx) {
        if (!element) return;
        const start = 0;
        const range = target - start;
        const startTime = Date.now();
        const baseFontSize = isWalletAgeOrTx ? 22 : 30;
        const startFontSize = baseFontSize * 1.1;
        const endFontSize = baseFontSize;

        function update() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = 1 - (1 - progress) ** 2;
            const current = start + range * easedProgress;
            element.textContent = isWalletAgeOrTx ? Math.floor(current) : formatNumber(current);
            element.style.fontSize = `${startFontSize + (endFontSize - startFontSize) * progress}px`;
            if (progress < 1) requestAnimationFrame(update);
            else {
                element.textContent = isWalletAgeOrTx ? target : formatNumber(target);
                element.style.fontSize = `${endFontSize}px`;
            }
        }

        element.style.fontSize = `${startFontSize}px`;
        element.textContent = isWalletAgeOrTx ? start : formatNumber(start);
        requestAnimationFrame(update);
    }

    const getMiningState = async (walletAddress) => {
        try {
            const doc = await db.collection('miningState').doc(walletAddress).get();
            return doc.exists ? doc.data() : { isMining: false, secondsRemaining: 3600, minedIgn: 0, lastUpdate: null };
        } catch (error) {
            console.error(`Failed to fetch miningState for ${walletAddress}:`, error);
            return { isMining: false, secondsRemaining: 3600, minedIgn: 0, lastUpdate: null };
        }
    };

    const saveMiningState = async (walletAddress, state) => {
        try {
            state.lastUpdate = Date.now();
            await db.collection('miningState').doc(walletAddress).set(state, { merge: true });
            return true;
        } catch (error) {
            console.error(`Failed to save miningState for ${walletAddress}:`, error);
            alert('Storage error.');
            return false;
        }
    };

    async function updateIgniteBalance(walletAddress, amount) {
        const walletData = await getWalletData(walletAddress);
        if (!walletData) return false;
        const oldBalance = Number(walletData.igniteBalance) || 0;
        const newAmount = Number(amount) || 0;
        if (newAmount <= 0) return false;
        walletData.igniteBalance = oldBalance + newAmount;
        const success = await saveWalletData(walletAddress, walletData);
        if (success) {
            document.querySelectorAll('#IgniteBalance').forEach(span => span.textContent = formatNumber(walletData.igniteBalance));
            return true;
        }
        return false;
    }

    async function updateSparksBalance(walletAddress, amount) {
        const walletData = await getWalletData(walletAddress);
        if (!walletData) return false;
        const oldBalance = Number(walletData.sparksBalance) || 0;
        const newAmount = Number(amount) || 0;
        if (newAmount <= 0) return false;
        walletData.sparksBalance = oldBalance + newAmount;
        const success = await saveWalletData(walletAddress, walletData);
        if (success) {
            document.querySelectorAll('#SparksBalance').forEach(span => span.textContent = formatNumber(walletData.sparksBalance));
            return true;
        }
        return false;
    }

    async function displayWalletData() {
        const walletAddress = sessionStorage.getItem('currentWalletAddress');
        let walletData = sessionStorage.getItem('walletData') ? JSON.parse(sessionStorage.getItem('walletData')) : await getWalletData(walletAddress);
        if (!walletData || !walletAddress) {
            console.warn('No wallet data or address');
            return;
        }

        sessionStorage.setItem('walletData', JSON.stringify(walletData));
        const spans = {
            walletAge: document.getElementById('walletAge'),
            claimableBalanceAge: document.getElementById('claimableBalanceAge'),
            transactionCount: document.getElementById('transactionCount'),
            claimableBalanceTx: document.getElementById('claimableBalanceTx'),
            claimableSparkAge: document.getElementById('claimableSparkAge'),
            claimableSparkTx: document.getElementById('claimableSparkTx'),
            walletPublicKey: document.getElementById('walletPublicKey'),
            IgniteBalance: document.getElementById('IgniteBalance'),
            SparksBalance: document.getElementById('SparksBalance'),
            SpanInviteCode: document.getElementById('SpanInviteCode'),
            spanInviteLink: document.getElementById('spanInviteLink'),
            IgnPerHour: document.getElementById('IgnPerHour'),
            MiningIgn: document.getElementById('MiningIgn'),
            MiningTimer: document.getElementById('MiningTimer')
        };

        const walletInfo = document.querySelector('.wallet-info');
        if (walletInfo) walletInfo.style.display = 'block';

        if (spans.walletAge) animateCount(spans.walletAge, walletData.walletAgeDays || 0, 5000, true);
        if (spans.claimableBalanceAge) animateCount(spans.claimableBalanceAge, walletData.ageClaimed ? 0 : walletData.claimableBalanceAge, 5000, false);
        if (spans.transactionCount) animateCount(spans.transactionCount, walletData.transactionCount || 0, 5000, true);
        if (spans.claimableBalanceTx) animateCount(spans.claimableBalanceTx, walletData.txClaimed ? 0 : walletData.claimableBalanceTx, 5000, false);
        if (spans.claimableSparkAge) animateCount(spans.claimableSparkAge, walletData.ageSparkClaimed ? 0 : walletData.claimableSparkAge, 5000, false);
        if (spans.claimableSparkTx) animateCount(spans.claimableSparkTx, walletData.txSparkClaimed ? 0 : walletData.claimableSparkTx, 5000, false);
        if (spans.walletPublicKey) spans.walletPublicKey.textContent = walletData.formattedPublicKey || 'Not connected';
        if (spans.IgniteBalance) spans.IgniteBalance.textContent = formatNumber(walletData.igniteBalance || 0);
        if (spans.SparksBalance) spans.SparksBalance.textContent = formatNumber(walletData.sparksBalance || 200);
        if (spans.SpanInviteCode) spans.SpanInviteCode.textContent = walletData.spanInviteCode || '';
        if (spans.spanInviteLink) spans.spanInviteLink.textContent = walletData.spanInviteLink || '';
        if (spans.IgnPerHour) spans.IgnPerHour.textContent = formatNumber((walletData.sparksBalance || 200) * 0.00025 * 3600);
        if (spans.MiningIgn) spans.MiningIgn.textContent = formatNumber(0);
        if (spans.MiningTimer) spans.MiningTimer.textContent = '01h 00m 00s';
    }

    function startAnimations() {
        const elements = {
            polik: document.querySelector('.polik'),
            logos: document.querySelector('.logos'),
            logons: document.querySelector('.logons')
        };
        if (elements.polik) {
            elements.polik.classList.remove('animate');
            elements.polik.style.width = '0.1px';
            void elements.polik.offsetWidth;
            elements.polik.classList.add('animate');
        }
        if (elements.logos) {
            elements.logos.classList.remove('animate');
            elements.logos.style.marginLeft = '2px';
            void elements.logos.offsetWidth;
            elements.logos.classList.add('animate');
        }
        if (elements.logons) {
            elements.logons.classList.remove('animate');
            void elements.logons.offsetWidth;
            elements.logons.classList.add('animate');
        }
    }

    function stopAnimations() {
        const elements = {
            polik: document.querySelector('.polik'),
            logos: document.querySelector('.logos'),
            logons: document.querySelector('.logons')
        };
        if (elements.polik) elements.polik.classList.remove('animate');
        if (elements.logos) elements.logos.classList.remove('animate');
        if (elements.logons) elements.logons.classList.remove('animate');
    }

    async function setupMining() {
        const mineButton = document.getElementById('mineButton');
        const walletAddress = sessionStorage.getItem('currentWalletAddress');
        if (!mineButton || !walletAddress) return;

        const walletData = await getWalletData(walletAddress);
        if (!walletData) return;

        let mining = await getMiningState(walletAddress);
        let { isMining, secondsRemaining, minedIgn, lastUpdate } = mining;
        let miningInterval;
        const sparksBalance = Number(walletData.sparksBalance) || 200;
        const ignPerSecond = (sparksBalance * 0.00025) / 3600;
        const totalIgn = sparksBalance * 0.00025;
        const miningIgnSpan = document.getElementById('MiningIgn');
        const miningTimerSpan = document.getElementById('MiningTimer');

        function updateTimerDisplay() {
            const hours = Math.floor(secondsRemaining / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((secondsRemaining % 3600) / 60).toString().padStart(2, '0');
            const seconds = (secondsRemaining % 60).toString().padStart(2, '0');
            if (miningTimerSpan) miningTimerSpan.textContent = `${hours}h ${minutes}m ${seconds}s`;
        }

        async function startMining() {
            if (isMining) return;
            isMining = true;
            secondsRemaining = 3600;
            minedIgn = 0;
            mineButton.textContent = 'Mining...';
            mineButton.classList.add('disabled');
            mineButton.disabled = true;
            startAnimations();
            updateTimerDisplay();

            miningInterval = setInterval(async () => {
                secondsRemaining--;
                minedIgn += ignPerSecond;
                updateTimerDisplay();
                if (miningIgnSpan) miningIgnSpan.textContent = formatNumber(minedIgn);
                await saveMiningState(walletAddress, { isMining, secondsRemaining, minedIgn, lastUpdate: Date.now() });

                if (secondsRemaining <= 0) {
                    clearInterval(miningInterval);
                    isMining = false;
                    mineButton.textContent = 'Claim';
                    mineButton.classList.remove('disabled');
                    mineButton.disabled = false;
                    stopAnimations();
                    await saveMiningState(walletAddress, { isMining, secondsRemaining, minedIgn, lastUpdate: null });
                }
            }, 1000);
        }

        async function claimMinedIgn() {
            if (isMining || mineButton.textContent !== 'Claim') return;
            if (await updateIgniteBalance(walletAddress, totalIgn)) {
                mineButton.textContent = 'Mine';
                minedIgn = 0;
                secondsRemaining = 3600;
                stopAnimations();
                await saveMiningState(walletAddress, { isMining: false, secondsRemaining, minedIgn, lastUpdate: null });
                if (miningIgnSpan) miningIgnSpan.textContent = formatNumber(0);
                if (miningTimerSpan) miningTimerSpan.textContent = '01h 00m 00s';
            }
        }

        if (isMining && lastUpdate) {
            const elapsedSeconds = Math.floor((Date.now() - lastUpdate) / 1000);
            secondsRemaining = Math.max(0, secondsRemaining - elapsedSeconds);
            minedIgn += ignPerSecond * elapsedSeconds;
            if (secondsRemaining <= 0) {
                isMining = false;
                mineButton.textContent = 'Claim';
                mineButton.classList.remove('disabled');
                mineButton.disabled = false;
                stopAnimations();
            } else {
                await startMining();
            }
            updateTimerDisplay();
            if (miningIgnSpan) miningIgnSpan.textContent = formatNumber(minedIgn);
            await saveMiningState(walletAddress, { isMining, secondsRemaining, minedIgn, lastUpdate: Date.now() });
        }

        mineButton.addEventListener('click', async () => {
            if (mineButton.textContent === 'Mine') await startMining();
            else if (mineButton.textContent === 'Claim') await claimMinedIgn();
        });
    }

    function showWalletConnectedPopup() {
        const popup = document.createElement('div');
        popup.id = 'wallet-connected-popup';
        popup.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000';
        const content = document.createElement('div');
        content.style.cssText = 'background: #fff; padding: 20px; border-radius: 5px; text-align: center; max-width: 400px';
        content.innerHTML = '<p>Wallet connected!</p><button type="button" style="padding: 10px 20px; cursor: pointer;">Go Earn</button>';
        content.querySelector('button').addEventListener('click', () => {
            popup.remove();
            window.location.href = 'airdrop.html';
        });
        popup.appendChild(content);
        popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
        document.body.appendChild(popup);
    }

    async function fetchWalletData(walletAddress) {
        if (!window.solanaWeb3 || !ALCHEMY_API_KEY) {
            console.warn('Missing solanaWeb3 or ALCHEMY_API_KEY');
            return { walletAgeDays: 0, transactionCount: 0 };
        }
        try {
            const connection = new window.solanaWeb3.Connection(ALCHEMY_API_URL, 'confirmed');
            const publicKey = new window.solanaWeb3.PublicKey(walletAddress);
            let allSignatures = [];
            let before = null;
            while (true) {
                const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 1000, before });
                if (signatures.length === 0) break;
                allSignatures.push(...signatures);
                before = signatures[signatures.length - 1].signature;
            }
            const transactionCount = allSignatures.length;
            if (transactionCount === 0) return { walletAgeDays: 0, transactionCount };

            const oldestSignature = allSignatures[allSignatures.length - 1].signature;
            const transaction = await connection.getParsedTransaction(oldestSignature, { maxSupportedTransactionVersion: 0 });
            if (!transaction || !transaction.blockTime) {
                return { walletAgeDays: 0, transactionCount };
            }

            const walletAgeDays = Math.floor((Date.now() - (transaction.blockTime * 1000)) / (1000 * 60 * 60 * 24));
            return { walletAgeDays: Math.max(0, walletAgeDays), transactionCount };
        } catch (error) {
            console.error('Failed to fetch wallet data:', error);
            return { walletAgeDays: 0, transactionCount: 0 };
        }
    }

    async function connectAndSignWallet() {
        if (!window.solana || !window.solana.isPhantom) {
            alert('Please install Phantom wallet or use a compatible browser.');
            console.error('Phantom wallet not detected');
            return;
        }

        try {
            const provider = window.solana;
            await provider.connect();
            const publicKey = provider.publicKey.toString();
            const message = new TextEncoder().encode('Sign for IGNITE airdrop eligibility.');
            await provider.signMessage(message);
            sessionStorage.setItem('currentWalletAddress', publicKey);

            let walletData = await getWalletData(publicKey);
            let { walletAgeDays, transactionCount } = walletData || (await fetchWalletData(publicKey)) || { walletAgeDays: 0, transactionCount: 0 };

            const claimableBalanceAge = walletData?.ageClaimed ? 0 : walletAgeDays * 10;
            const claimableBalanceTx = walletData?.txClaimed ? 0 : transactionCount * 20;
            const claimableSparkAge = walletData?.ageSparkClaimed ? 0 : walletAgeDays * 2;
            const claimableSparkTx = walletData?.txSparkClaimed ? 0 : transactionCount * 5;
            const formattedPublicKey = formatSolanaWallet(publicKey);

            if (!walletData) {
                const spanInviteCode = generateReferralCode();
                const spanInviteLink = `https://ignite-xyz.vercel.app/ref/${spanInviteCode}`;
                walletData = {
                    walletAgeDays,
                    transactionCount,
                    claimableBalanceAge,
                    claimableBalanceTx,
                    claimableSparkAge,
                    claimableSparkTx,
                    formattedPublicKey,
                    igniteBalance: 0,
                    sparksBalance: 200,
                    spanInviteCode,
                    spanInviteLink,
                    ageClaimed: false,
                    txClaimed: false,
                    ageSparkClaimed: false,
                    txSparkClaimed: false
                };
            } else {
                walletData = {
                    ...walletData,
                    walletAgeDays,
                    transactionCount,
                    claimableBalanceAge,
                    claimableBalanceTx,
                    claimableSparkAge,
                    claimableSparkTx,
                    formattedPublicKey
                };
            }

            await saveWalletData(publicKey, walletData);
            showWalletConnectedPopup();
            await displayWalletData();
            await setupMining();
            await setupClaimButtons();
        } catch (error) {
            console.error('Wallet connection failed:', error);
            alert('Failed to connect wallet. Please try again.');
        }
    }

    async function setupClaimButtons() {
        const walletAddress = sessionStorage.getItem('currentWalletAddress');
        const walletData = await getWalletData(walletAddress);
        if (!walletData || !walletAddress) return;

        const buttons = [
            { id: 'claimButtonAge', key: 'ageClaimed', amountKey: 'claimableBalanceAge', updateFn: updateIgniteBalance, log: 'IGN (age)' },
            { id: 'claimButtonTx', key: 'txClaimed', amountKey: 'claimableBalanceTx', updateFn: updateIgniteBalance, log: 'IGN (tx)' },
            { id: 'claimSparkButtonAge', key: 'ageSparkClaimed', amountKey: 'claimableSparkAge', updateFn: updateSparksBalance, log: 'Spark (age)' },
            { id: 'claimSparkButtonTx', key: 'txSparkClaimed', amountKey: 'claimableSparkTx', updateFn: updateSparksBalance, log: 'Spark (tx)' }
        ];

        for (const { id, key, amountKey, updateFn, log } of buttons) {
            const button = document.getElementById(id);
            if (!button) continue;
            const amount = Number(walletData[amountKey]) || 0;
            if (walletData[key] || amount <= 0) {
                button.textContent = 'Claimed';
                button.disabled = true;
                button.classList.add('disabled');
            } else {
                button.addEventListener('click', async () => {
                    if (await updateFn(walletAddress, amount)) {
                        walletData[key] = true;
                        walletData[amountKey] = 0;
                        await saveWalletData(walletAddress, walletData);
                        button.textContent = 'Claimed';
                        button.disabled = true;
                        button.classList.add('disabled');
                        await displayWalletData();
                    } else {
                        alert(`Failed to claim ${log}.`);
                    }
                });
            }
        }
    }

    const clearStorageButton = document.getElementById('clearStorage');
    if (clearStorageButton) {
        clearStorageButton.addEventListener('click', async () => {
            try {
                // Clear Firestore collections
                const collections = ['users', 'waitlist', 'tasks', 'walletData', 'miningState'];
                for (const collection of collections) {
                    const snapshot = await db.collection(collection).get();
                    const batch = db.batch();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
                // Clear localStorage and sessionStorage
                localStorage.removeItem('registeredEmail');
                sessionStorage.clear();
                console.log('Firestore and local storage cleared');
                alert('Data cleared. Refresh the page.');
            } catch (error) {
                console.error('Failed to clear Firestore data:', error);
                alert('Failed to clear data.');
            }
        });
    }

    if (connectWalletButton) {
        connectWalletButton.addEventListener('click', connectAndSignWallet);
    }
});
