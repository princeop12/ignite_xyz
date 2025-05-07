document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded and script running');

    // Debug: Check if createClient is available
    console.log('Checking for createClient:', typeof createClient);
    if (typeof createClient !== 'function') {
        console.error('createClient is not defined. Ensure the Supabase library is loaded correctly.');
        alert('Failed to load Supabase library. Please check the console for details.');
        // Proceed with the rest of the script so buttons can still work
    }

    // Fetch Supabase credentials from API
    let SUPABASE_URL, SUPABASE_KEY;
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error(`Failed to fetch Supabase config: ${response.status} ${response.statusText}`);
        }
        const config = await response.json();
        if (!config.SUPABASE_URL || !config.SUPABASE_KEY) {
            throw new Error('Supabase config missing URL or KEY');
        }
        SUPABASE_URL = config.SUPABASE_URL;
        SUPABASE_KEY = config.SUPABASE_KEY;
        console.log('Supabase credentials fetched successfully');
    } catch (error) {
        console.error('Error fetching Supabase credentials:', error.message);
        alert('Failed to initialize the app. Please try again later. Check the console for details.');
        return;
    }

    // Initialize Supabase client
    let supabase;
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase client initialized');
    } catch (error) {
        console.error('Error initializing Supabase client:', error.message);
        alert('Failed to initialize Supabase. Some features may not work. Check the console for details.');
        supabase = null; // Allow the script to continue without Supabase
    }

    // Function to generate an 8-character alphanumeric referral code
    const generateReferralCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    // Function to format Solana wallet address (first 6 chars + *** + last 6 chars)
    const formatSolanaWallet = (wallet) => {
        if (!wallet || wallet.length < 12) return 'Invalid Address';
        return `${wallet.substring(0, 6)}***${wallet.substring(wallet.length - 6)}`;
    };

    // Helper function to get all users from Supabase
    const getUsers = async () => {
        if (!supabase) {
            console.warn('Supabase not initialized. Skipping user fetch.');
            return [];
        }
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching users:', error.message);
            return [];
        }
    };

    // Helper function to get a user by email from Supabase
    const getUserByEmail = async (email) => {
        if (!supabase) {
            console.warn('Supabase not initialized. Skipping user fetch.');
            return null;
        }
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user by email:', error.message);
            return null;
        }
    };

    // Helper function to get the current user (based on sessionStorage)
    const getCurrentUser = async () => {
        const currentEmail = sessionStorage.getItem('currentUserEmail');
        if (!currentEmail) return null;
        return await getUserByEmail(currentEmail);
    };

    // Helper function to update user data in Supabase
    const updateUser = async (updatedUser) => {
        if (!supabase) {
            console.warn('Supabase not initialized. Skipping user update.');
            return false;
        }
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    points: updatedUser.points,
                    referrals: updatedUser.referrals
                })
                .eq('email', updatedUser.email);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating user:', error.message);
            return false;
        }
    };

    // Function to calculate position based on points
    const calculatePosition = async (currentUser) => {
        const users = await getUsers();
        if (users.length === 0 || !currentUser) return 1; // Default to #1 if no users
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

        if (!emailInput || !passwordInput || !solanaWalletInput || !twitterInput || !inviteCodeInput || !termsCheckbox || !joinButton) {
            console.error('Register form elements missing. Found:', {
                emailInput: !!emailInput,
                passwordInput: !!passwordInput,
                solanaWalletInput: !!solanaWalletInput,
                twitterInput: !!twitterInput,
                inviteCodeInput: !!inviteCodeInput,
                termsCheckbox: !!termsCheckbox,
                joinButton: !!joinButton
            });
            return;
        }
        console.log('All register form elements found');

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

        emailInput.addEventListener('input', () => {
            console.log('Email input event fired:', emailInput.value);
            validateForm();
        });
        passwordInput.addEventListener('input', () => {
            console.log('Password input event fired:', passwordInput.value);
            validateForm();
        });
        solanaWalletInput.addEventListener('input', () => {
            console.log('Solana Wallet input event fired:', solanaWalletInput.value);
            validateForm();
        });
        twitterInput.addEventListener('input', () => {
            console.log('Twitter input event fired:', twitterInput.value);
            validateForm();
        });
        termsCheckbox.addEventListener('change', () => {
            console.log('Terms checkbox event fired:', termsCheckbox.checked);
            validateForm();
        });

        console.log('Running initial validation for register form');
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
                referrals: 0
            };

            if (supabase) {
                try {
                    const { error: insertError } = await supabase
                        .from('users')
                        .insert(newUser);
                    if (insertError) throw insertError;
                    console.log('User registered successfully:', email);
                } catch (error) {
                    console.error('Error registering user:', error.message);
                    alert('Registration failed: ' + error.message);
                    return;
                }

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
            } else {
                console.warn('Supabase not initialized. Storing user data locally for now.');
                // Fallback: Store user data in sessionStorage (temporary)
                sessionStorage.setItem(`user_${email}`, JSON.stringify(newUser));
            }

            sessionStorage.setItem('currentUserEmail', email);
            window.location.href = 'profile.html';
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

        if (!loginEmailInput || !loginPasswordInput || !loginButton) {
            console.error('Login form elements missing. Found:', {
                loginEmailInput: !!loginEmailInput,
                loginPasswordInput: !!loginPasswordInput,
                loginButton: !!loginButton
            });
            return;
        }
        console.log('All login form elements found');

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

        loginEmailInput.addEventListener('input', () => {
            console.log('Login email input event fired:', loginEmailInput.value);
            validateLoginForm();
        });
        loginPasswordInput.addEventListener('input', () => {
            console.log('Login password input event fired:', loginPasswordInput.value);
            validateLoginForm();
        });

        console.log('Running initial validation for login form');
        validateLoginForm();

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted');

            const email = loginEmailInput.value.trim();
            const password = loginPasswordInput.value.trim();

            let user = null;
            if (supabase) {
                user = await getUserByEmail(email);
            } else {
                console.warn('Supabase not initialized. Checking local storage.');
                const storedUser = sessionStorage.getItem(`user_${email}`);
                user = storedUser ? JSON.parse(storedUser) : null;
            }

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
        let currentUser = await getCurrentUser();
        if (!currentUser) {
            console.warn('Supabase not initialized. Checking local storage.');
            const email = sessionStorage.getItem('currentUserEmail');
            const storedUser = email ? sessionStorage.getItem(`user_${email}`) : null;
            currentUser = storedUser ? JSON.parse(storedUser) : null;
        }

        if (currentUser) {
            displayEmail.textContent = currentUser.email || 'Not provided';
            displaySolanaWallet.textContent = formatSolanaWallet(currentUser.solana_wallet);
            displayTwitter.textContent = currentUser.twitter || 'Not provided';
        } else {
            window.location.href = 'login.html';
        }
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
        let currentUser = await getCurrentUser();
        if (!currentUser) {
            console.warn('Supabase not initialized. Checking local storage.');
            const email = sessionStorage.getItem('currentUserEmail');
            const storedUser = email ? sessionStorage.getItem(`user_${email}`) : null;
            currentUser = storedUser ? JSON.parse(storedUser) : null;
        }

        if (currentUser) {
            displayEmail.textContent = currentUser.email || 'Not provided';
            const position = await calculatePosition(currentUser);
            displayPosition.textContent = `#${position}`;
            displayPoints.textContent = currentUser.points || '0';
            displayReferrals.textContent = currentUser.referrals || '0';
            displayReferralCode.textContent = currentUser.referral_link || 'Not provided';

            const tasks = [
                { taskId: 'twitterTask', claimId: 'twitterClaim', key: 'twitterTaskCompleted' },
                { taskId: 'telegramTask', claimId: 'telegramClaim', key: 'telegramTaskCompleted' },
                { taskId: 'telegram2Task', claimId: 'telegram2Claim', key: 'telegram2TaskCompleted' },
                { taskId: 'discordTask', claimId: 'discordClaim', key: 'discordTaskCompleted' }
            ];

            for (const task of tasks) {
                const taskButton = document.getElementById(task.taskId);
                const claimButton = document.getElementById(task.claimId);

                if (!taskButton || !claimButton) {
                    console.error(`Task/Claim buttons missing for ${task.key}. Found:`, {
                        taskButton: !!taskButton,
                        claimButton: !!claimButton
                    });
                    continue;
                }

                let taskCompleted = false;
                let taskClaimed = false;
                if (supabase) {
                    try {
                        const { data: taskData, error: taskError } = await supabase
                            .from('tasks')
                            .select('completed, claimed')
                            .eq('user_email', currentUser.email)
                            .eq('task_key', task.key)
                            .single();
                        if (taskError && taskError.code !== 'PGRST116') {
                            throw taskError;
                        }
                        taskCompleted = taskData?.completed || false;
                        taskClaimed = taskData?.claimed || false;
                    } catch (error) {
                        console.error(`Error fetching task ${task.key}:`, error.message);
                    }
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
                    if (supabase) {
                        try {
                            const { error: upsertError } = await supabase
                                .from('tasks')
                                .upsert(
                                    { user_email: currentUser.email, task_key: task.key, completed: true, claimed: false },
                                    { onConflict: ['user_email', 'task_key'] }
                                );
                            if (upsertError) throw upsertError;
                            taskCompleted = true;
                            claimButton.classList.remove('disabled');
                            claimButton.disabled = false;
                            console.log(`Claim button enabled: ${task.claimId}`);
                        } catch (error) {
                            console.error('Error marking task as completed:', error.message);
                            alert('Failed to mark task as completed: ' + error.message);
                        }
                    } else {
                        console.warn('Supabase not initialized. Simulating task completion.');
                        taskCompleted = true;
                        claimButton.classList.remove('disabled');
                        claimButton.disabled = false;
                        console.log(`Claim button enabled: ${task.claimId}`);
                    }
                });

                claimButton.addEventListener('click', async () => {
                    console.log(`Claim button clicked: ${task.claimId}`);
                    if (!taskClaimed) {
                        const newPoints = (currentUser.points || 0) + 10;
                        let updateSuccess = true;
                        if (supabase) {
                            updateSuccess = await updateUser({ ...currentUser, points: newPoints });
                            if (!updateSuccess) {
                                alert('Failed to claim points. Please try again.');
                                return;
                            }

                            try {
                                const { error: claimError } = await supabase
                                    .from('tasks')
                                    .upsert(
                                        { user_email: currentUser.email, task_key: task.key, completed: true, claimed: true },
                                        { onConflict: ['user_email', 'task_key'] }
                                    );
                                if (claimError) throw claimError;
                            } catch (error) {
                                console.error('Error marking task as claimed:', error.message);
                                alert('Failed to claim task: ' + error.message);
                                return;
                            }
                        } else {
                            console.warn('Supabase not initialized. Updating points locally.');
                        }

                        taskClaimed = true;
                        currentUser.points = newPoints;
                        displayPoints.textContent = currentUser.points;
                        displayPosition.textContent = `#${await calculatePosition(currentUser)}`;
                        claimButton.textContent = 'Claimed';
                        claimButton.classList.add('disabled');
                        claimButton.disabled = true;
                        console.log('Claim button marked as Claimed');
                    }
                });
            }

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
