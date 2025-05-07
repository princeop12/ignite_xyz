document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and script running');

    // Initialize Firebase (replace with your config from Firebase Console)
    const firebaseConfig = {
        apiKey: "AIzaSyDG_GCVLfLYzIepcIi_BnuemIVfLccMPWg",
        authDomain: "ignitexyz-f459f.firebaseapp.com",
        projectId: "ignitexyz-f459f",
        storageBucket: "ignitexyz-f459f.firebasestorage.app",
        messagingSenderId: "631548240313",
        appId: "1:631548240313:web:f0896c75166336de805668"
      };

    // Initialize Firebase app and Firestore
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Function to generate an 8-character alphanumeric referral code
    const generateReferralCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    // Function to format Solana wallet address
    const formatSolanaWallet = (wallet) => {
        if (!wallet || wallet.length < 12) return 'Invalid Address';
        return `${wallet.substring(0, 6)}***${wallet.substring(wallet.length - 6)}`;
    };

    // Helper function to get all users from Firestore
    const getUsers = async () => {
        try {
            const usersSnapshot = await db.collection('users').get();
            return usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching users:', error.message);
            return [];
        }
    };

    // Helper function to get a user by email from Firestore
    const getUserByEmail = async (email) => {
        try {
            const usersSnapshot = await db.collection('users').where('email', '==', email).get();
            if (usersSnapshot.empty) return null;
            const userDoc = usersSnapshot.docs[0];
            return { id: userDoc.id, ...userDoc.data() };
        } catch (error) {
            console.error('Error fetching user by email:', error.message);
            return null;
        }
    };

    // Helper function to get the current user
    const getCurrentUser = async () => {
        const currentEmail = sessionStorage.getItem('currentUserEmail');
        if (!currentEmail) return null;
        return await getUserByEmail(currentEmail);
    };

    // Helper function to update user data in Firestore
    const updateUser = async (updatedUser) => {
        try {
            await db.collection('users').doc(updatedUser.id).update({
                points: updatedUser.points,
                referrals: updatedUser.referrals
            });
            return true;
        } catch (error) {
            console.error('Error updating user:', error.message);
            return false;
        }
    };

    // Function to calculate position based on points
    const calculatePosition = async (currentUser) => {
        const users = await getUsers();
        if (users.length === 0 || !currentUser) return 1;
        const sortedUsers = [...users].sort((a, b) => (b.points || 0) - (a.points || 0));
        return sortedUsers.findIndex(user => user.email === currentUser.email) + 1;
    };

    // Register Page Logic
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        console.log('Register form found');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const solanaWalletInput = document.getElementById('solanaWallet');
        const twitterInput = document.getElementById('twitter');
        const inviteCodeInput = document.getElementById('inviteCode');
        const termsCheckbox = document.getElementById('termsCheckbox');
        const joinButton = document.getElementById('joinButton');
        const errorMessage = document.createElement('div');
        errorMessage.style.color = 'red';
        errorMessage.style.fontSize = '12px';
        errorMessage.style.marginTop = '10px';
        registerForm.appendChild(errorMessage);

        const validateForm = () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const solanaWallet = solanaWalletInput.value.trim();
            const twitter = twitterInput.value.trim();
            const termsChecked = termsCheckbox.checked;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isEmailValid = emailRegex.test(email);
            const isPasswordValid = password.length >= 8;
            const isSolanaWalletValid = solanaWallet.length >= 32;
            const isTwitterValid = twitter.length > 0;

            console.log('Register Form Validation:', {
                email,
                isEmailValid,
                password,
                isPasswordValid,
                solanaWallet,
                isSolanaWalletValid,
                twitter,
                isTwitterValid,
                termsChecked
            });

            let errorMessages = [];
            if (!isEmailValid) errorMessages.push('Please enter a valid email.');
            if (!isPasswordValid) errorMessages.push('Password must be at least 8 characters.');
            if (!isSolanaWalletValid) errorMessages.push('Solana wallet address must be at least 32 characters.');
            if (!isTwitterValid) errorMessages.push('Twitter handle is required.');
            if (!termsChecked) errorMessages.push('You must agree to the terms.');

            if (errorMessages.length > 0) {
                errorMessage.textContent = errorMessages.join(' ');
                joinButton.disabled = true;
                joinButton.classList.add('disabled');
                console.log('Join Now button disabled');
            } else {
                errorMessage.textContent = '';
                joinButton.disabled = false;
                joinButton.classList.remove('disabled');
                console.log('Join Now button enabled');
            }
        };

        emailInput.addEventListener('input', validateForm);
        passwordInput.addEventListener('input', validateForm);
        solanaWalletInput.addEventListener('input', validateForm);
        twitterInput.addEventListener('input', validateForm);
        termsCheckbox.addEventListener('change', validateForm);

        validateForm();

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Register form submitted');

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const solanaWallet = solanaWalletInput.value.trim();
            const twitter = twitterInput.value.trim();
            const inviteCode = inviteCodeInput.value.trim();

            const users = await getUsers();
            if (users.some(user => user.email === email)) {
                alert('Email already registered. Please log in.');
                window.location.href = 'login.html';
                return;
            }

            const referralCode = generateReferralCode();
            const referralLink = `https://ignite-xyz.vercel.app/ref/${referralCode}`;

            const newUser = {
                email,
                password,
                solana_wallet: solanaWallet,
                twitter,
                referral_code: referralCode,
                referral_link: referralLink,
                points: 0,
                referrals: 0,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                await db.collection('users').add(newUser);
                if (inviteCode) {
                    const referrer = users.find(user => user.referral_code === inviteCode);
                    if (referrer) {
                        const updatedReferrer = {
                            ...referrer,
                            referrals: (referrer.referrals || 0) + 1,
                            points: (referrer.points || 0) + 10
                        };
                        await updateUser(updatedReferrer);
                    }
                }
                sessionStorage.setItem('currentUserEmail', email);
                window.location.href = 'profile.html';
            } catch (error) {
                console.error('Error registering user:', error.message);
                alert('Registration failed: ' + error.message);
            }
        });
    } else {
        console.log('Register form not found on this page');
    }

    // Login Page Logic
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('Login form found');
        const loginEmailInput = document.getElementById('loginEmail');
        const loginPasswordInput = document.getElementById('loginPassword');
        const loginButton = document.getElementById('loginButton');
        const errorMessage = document.createElement('div');
        errorMessage.style.color = 'red';
        errorMessage.style.fontSize = '12px';
        errorMessage.style.marginTop = '10px';
        loginForm.appendChild(errorMessage);

        const validateLoginForm = () => {
            const email = loginEmailInput.value.trim();
            const password = loginPasswordInput.value.trim();

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isEmailValid = emailRegex.test(email);
            const isPasswordValid = password.length >= 8;

            console.log('Login Form Validation:', {
                email,
                isEmailValid,
                password,
                isPasswordValid
            });

            let errorMessages = [];
            if (!isEmailValid) errorMessages.push('Please enter a valid email.');
            if (!isPasswordValid) errorMessages.push('Password must be at least 8 characters.');

            if (errorMessages.length > 0) {
                errorMessage.textContent = errorMessages.join(' ');
                loginButton.disabled = true;
                loginButton.classList.add('disabled');
                console.log('Login button disabled');
            } else {
                errorMessage.textContent = '';
                loginButton.disabled = false;
                loginButton.classList.remove('disabled');
                console.log('Login button enabled');
            }
        };

        loginEmailInput.addEventListener('input', validateLoginForm);
        loginPasswordInput.addEventListener('input', validateLoginForm);

        validateLoginForm();

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted');

            const email = loginEmailInput.value.trim();
            const password = loginPasswordInput.value.trim();

            const user = await getUserByEmail(email);

            if (user && user.password === password) {
                sessionStorage.setItem('currentUserEmail', email);
                window.location.href = 'profile.html';
            } else {
                alert('Invalid email or password.');
            }
        });
    } else {
        console.log('Login form not found on this page');
    }

    // Profile Page Logic
    const displayEmail = document.getElementById('displayEmail');
    const displaySolanaWallet = document.getElementById('displaySolanaWallet');
    const displayTwitter = document.getElementById('displayTwitter');
    if (displayEmail && displaySolanaWallet && displayTwitter) {
        console.log('Profile page elements found');
        getCurrentUser().then(currentUser => {
            if (currentUser) {
                displayEmail.textContent = currentUser.email || 'Not provided';
                displaySolanaWallet.textContent = formatSolanaWallet(currentUser.solana_wallet);
                displayTwitter.textContent = currentUser.twitter || 'Not provided';
            } else {
                window.location.href = 'login.html';
            }
        });
    } else {
        console.log('Profile page elements not found');
    }

    // Dashboard Page Logic
    const displayPoints = document.getElementById('displayPoints');
    const displayPosition = document.getElementById('displayPosition');
    const displayReferrals = document.getElementById('displayReferrals');
    const displayReferralCode = document.getElementById('displayReferralCode');
    if (displayEmail && displayPoints && displayPosition && displayReferrals && displayReferralCode) {
        console.log('Dashboard page elements found');
        getCurrentUser().then(currentUser => {
            if (currentUser) {
                displayEmail.textContent = currentUser.email || 'Not provided';
                calculatePosition(currentUser).then(position => {
                    displayPosition.textContent = `#${position}`;
                });
                displayPoints.textContent = currentUser.points || '0';
                displayReferrals.textContent = currentUser.referrals || '0';
                displayReferralCode.textContent = currentUser.referral_link || 'Not provided';

                const tasks = [
                    { taskId: 'twitterTask', claimId: 'twitterClaim', key: 'twitterTaskCompleted' },
                    { taskId: 'telegramTask', claimId: 'telegramClaim', key: 'telegramTaskCompleted' },
                    { taskId: 'telegram2Task', claimId: 'telegram2Claim', key: 'telegram2TaskCompleted' },
                    { taskId: 'discordTask', claimId: 'discordClaim', key: 'discordTaskCompleted' }
                ];

                tasks.forEach(task => {
                    const taskButton = document.getElementById(task.taskId);
                    const claimButton = document.getElementById(task.claimId);

                    if (!taskButton || !claimButton) {
                        console.error(`Task/Claim buttons missing for ${task.key}`);
                        return;
                    }

                    let taskCompleted = false;
                    let taskClaimed = false;
                    let taskDocId = null;

                    // Fetch task status from Firestore
                    db.collection('tasks')
                        .where('user_email', '==', currentUser.email)
                        .where('task_key', '==', task.key)
                        .get()
                        .then(taskSnapshot => {
                            if (!taskSnapshot.empty) {
                                const taskDoc = taskSnapshot.docs[0];
                                taskDocId = taskDoc.id;
                                taskCompleted = taskDoc.data().completed || false;
                                taskClaimed = taskDoc.data().claimed || false;
                            }

                            if (taskClaimed) {
                                claimButton.textContent = 'Claimed';
                                claimButton.classList.add('disabled');
                                claimButton.disabled = true;
                                console.log(`Claim button ${task.claimId} set to Claimed`);
                            } else if (taskCompleted) {
                                claimButton.classList.remove('disabled');
                                claimButton.disabled = false;
                                console.log(`Claim button ${task.claimId} enabled`);
                            }

                            taskButton.addEventListener('click', async () => {
                                console.log(`Task button clicked: ${task.taskId}`);
                                try {
                                    if (taskDocId) {
                                        await db.collection('tasks').doc(taskDocId).update({
                                            completed: true,
                                            claimed: false
                                        });
                                    } else {
                                        const newTask = await db.collection('tasks').add({
                                            user_email: currentUser.email,
                                            task_key: task.key,
                                            completed: true,
                                            claimed: false
                                        });
                                        taskDocId = newTask.id;
                                    }
                                    taskCompleted = true;
                                    claimButton.classList.remove('disabled');
                                    claimButton.disabled = false;
                                    console.log(`Claim button enabled: ${task.claimId}`);
                                } catch (error) {
                                    console.error('Error marking task as completed:', error.message);
                                    alert('Failed to mark task as completed: ' + error.message);
                                }
                            });

                            claimButton.addEventListener('click', async () => {
                                console.log(`Claim button clicked: ${task.claimId}`);
                                if (!taskClaimed) {
                                    const newPoints = (currentUser.points || 0) + 10;
                                    const updateSuccess = await updateUser({ ...currentUser, points: newPoints });

                                    if (!updateSuccess) {
                                        alert('Failed to claim points. Please try again.');
                                        return;
                                    }

                                    try {
                                        await db.collection('tasks').doc(taskDocId).update({ claimed: true });
                                        taskClaimed = true;
                                        currentUser.points = newPoints;
                                        displayPoints.textContent = currentUser.points;
                                        calculatePosition(currentUser).then(position => {
                                            displayPosition.textContent = `#${position}`;
                                        });
                                        claimButton.textContent = 'Claimed';
                                        claimButton.classList.add('disabled');
                                        claimButton.disabled = true;
                                        console.log('Claim button marked as Claimed');
                                    } catch (error) {
                                        console.error('Error marking task as claimed:', error.message);
                                        alert('Failed to claim task: ' + error.message);
                                    }
                                }
                            });
                        });
                });

                const copyReferralButton = document.getElementById('copyReferralButton');
                if (copyReferralButton) {
                    copyReferralButton.addEventListener('click', () => {
                        console.log('Copy referral button clicked');
                        navigator.clipboard.writeText(currentUser.referral_link || '')
                            .then(() => alert('Referral link copied to clipboard!'))
                            .catch(() => alert('Failed to copy referral link.'));
                    });
                }
            } else {
                window.location.href = 'login.html';
            }
        });
    } else {
        console.log('Dashboard page elements not found');
    }

    // Logout Logic
    const logoutButton = document.querySelector('.logoutButton');
    if (logoutButton) {
        console.log('Logout button found');
        logoutButton.addEventListener('click', () => {
            console.log('Logout button clicked');
            sessionStorage.removeItem('currentUserEmail');
            window.location.href = 'login.html';
        });
    } else {
        console.log('Logout button not found');
    }

    console.log('Script execution completed');
});