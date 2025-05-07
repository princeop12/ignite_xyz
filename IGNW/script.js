document.addEventListener('DOMContentLoaded', async () => {
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
    } catch (error) {
        console.error('Error fetching Supabase credentials:', error.message);
        alert('Failed to initialize the app. Please try again later. Check the console for details.');
        return;
    }

    // Initialize Supabase client
    const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
        const { data, error } = await supabase
            .from('users')
            .select('*');
        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        return data || [];
    };

    // Helper function to get a user by email from Supabase
    const getUserByEmail = async (email) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (error) {
            console.error('Error fetching user:', error);
            return null;
        }
        return data;
    };

    // Helper function to get the current user (based on sessionStorage)
    const getCurrentUser = async () => {
        const currentEmail = sessionStorage.getItem('currentUserEmail');
        if (!currentEmail) return null;
        return await getUserByEmail(currentEmail);
    };

    // Helper function to update user data in Supabase
    const updateUser = async (updatedUser) => {
        const { error } = await supabase
            .from('users')
            .update({
                points: updatedUser.points,
                referrals: updatedUser.referrals
            })
            .eq('email', updatedUser.email);
        if (error) {
            console.error('Error updating user:', error);
            return false;
        }
        return true;
    };

    // Function to calculate position based on points
    const calculatePosition = async (currentUser) => {
        const users = await getUsers();
        if (users.length === 0) return 1; // Default to #1 if no users
        const sortedUsers = [...users].sort((a, b) => (b.points || 0) - (a.points || 0));
        return sortedUsers.findIndex(user => user.email === currentUser.email) + 1;
    };

    // Register Page Logic
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const solanaWalletInput = document.getElementById('solanaWallet');
        const twitterInput = document.getElementById('twitter');
        const inviteCodeInput = document.getElementById('inviteCode');
        const termsCheckbox = document.getElementById('termsCheckbox');
        const joinButton = document.getElementById('joinButton');

        // Validate that all elements exist
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

        const validateForm = () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const solanaWallet = solanaWalletInput.value.trim();
            const twitter = twitterInput.value.trim();
            const termsChecked = termsCheckbox.checked;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isEmailValid = emailRegex.test(email);
            const isPasswordValid = password.length >= 8;
            const isSolanaWalletValid = solanaWallet.length >= 32; // Adjusted to typical Solana address length
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

            if (isEmailValid && isPasswordValid && isSolanaWalletValid && isTwitterValid && termsChecked) {
                joinButton.classList.remove('disabled');
                joinButton.removeAttribute('disabled');
                console.log('Join Now button enabled');
            } else {
                joinButton.classList.add('disabled');
                joinButton.setAttribute('disabled', 'true');
                console.log('Join Now button disabled');
            }
        };

        // Attach event listeners with logging
        emailInput.addEventListener('input', () => {
            console.log('Email input changed:', emailInput.value);
            validateForm();
        });
        passwordInput.addEventListener('input', () => {
            console.log('Password input changed:', passwordInput.value);
            validateForm();
        });
        solanaWalletInput.addEventListener('input', () => {
            console.log('Solana Wallet input changed:', solanaWalletInput.value);
            validateForm();
        });
        twitterInput.addEventListener('input', () => {
            console.log('Twitter input changed:', twitterInput.value);
            validateForm();
        });
        termsCheckbox.addEventListener('change', () => {
            console.log('Terms checkbox changed:', termsCheckbox.checked);
            validateForm();
        });

        // Initial validation
        validateForm();

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

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

            const { error: insertError } = await supabase
                .from('users')
                .insert(newUser);
            if (insertError) {
                console.error('Error registering user:', insertError);
                alert('Registration failed. Please try again.');
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

            sessionStorage.setItem('currentUserEmail', email);
            window.location.href = 'profile.html';
        });
    }

    // Login Page Logic
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const loginEmailInput = document.getElementById('loginEmail');
        const loginPasswordInput = document.getElementById('loginPassword');
        const loginButton = document.getElementById('loginButton');

        if (!loginEmailInput || !loginPasswordInput || !loginButton) {
            console.error('Login form elements missing. Found:', {
                loginEmailInput: !!loginEmailInput,
                loginPasswordInput: !!loginPasswordInput,
                loginButton: !!loginButton
            });
            return;
        }

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

            if (isEmailValid && isPasswordValid) {
                loginButton.classList.remove('disabled');
                loginButton.removeAttribute('disabled');
                console.log('Login button enabled');
            } else {
                loginButton.classList.add('disabled');
                loginButton.setAttribute('disabled', 'true');
                console.log('Login button disabled');
            }
        };

        loginEmailInput.addEventListener('input', () => {
            console.log('Login email input changed:', loginEmailInput.value);
            validateLoginForm();
        });
        loginPasswordInput.addEventListener('input', () => {
            console.log('Login password input changed:', loginPasswordInput.value);
            validateLoginForm();
        });

        validateLoginForm();

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

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
    }

    // Profile Page Logic
    const displayEmail = document.getElementById('displayEmail');
    const displaySolanaWallet = document.getElementById('displaySolanaWallet');
    const displayTwitter = document.getElementById('displayTwitter');
    if (displayEmail && displaySolanaWallet && displayTwitter) {
        const currentUser = await getCurrentUser();
        if (currentUser) {
            displayEmail.textContent = currentUser.email || 'Not provided';
            displaySolanaWallet.textContent = formatSolanaWallet(currentUser.solana_wallet);
            displayTwitter.textContent = currentUser.twitter || 'Not provided';
        } else {
            window.location.href = 'login.html';
        }
    }

    // Dashboard Page Logic
    const displayPoints = document.getElementById('displayPoints');
    const displayPosition = document.getElementById('displayPosition');
    const displayReferrals = document.getElementById('displayReferrals');
    const displayReferralCode = document.getElementById('displayReferralCode');
    if (displayEmail && displayPoints && displayPosition && displayReferrals && displayReferralCode) {
        const currentUser = await getCurrentUser();
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

                const { data: taskData, error: taskError } = await supabase
                    .from('tasks')
                    .select('completed, claimed')
                    .eq('user_email', currentUser.email)
                    .eq('task_key', task.key)
                    .single();

                let taskCompleted = taskData?.completed || false;
                let taskClaimed = taskData?.claimed || false;

                if (taskClaimed) {
                    claimButton.textContent = 'Claimed';
                    claimButton.classList.add('disabled');
                    claimButton.setAttribute('disabled', 'true');
                } else if (taskCompleted) {
                    claimButton.classList.remove('disabled');
                    claimButton.removeAttribute('disabled');
                    console.log(`Claim button enabled: ${task.claimId}`);
                }

                taskButton.addEventListener('click', async () => {
                    console.log(`Task button clicked: ${task.taskId}`);
                    const { error: upsertError } = await supabase
                        .from('tasks')
                        .upsert(
                            { user_email: currentUser.email, task_key: task.key, completed: true },
                            { onConflict: ['user_email', 'task_key'] }
                        );
                    if (upsertError) {
                        console.error('Error marking task as completed:', upsertError);
                        return;
                    }

                    taskCompleted = true;
                    claimButton.classList.remove('disabled');
                    claimButton.removeAttribute('disabled');
                    console.log(`Claim button enabled: ${task.claimId}`);
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

                        const { error: claimError } = await supabase
                            .from('tasks')
                            .upsert(
                                { user_email: currentUser.email, task_key: task.key, completed: true, claimed: true },
                                { onConflict: ['user_email', 'task_key'] }
                            );
                        if (claimError) {
                            console.error('Error marking task as claimed:', claimError);
                            return;
                        }

                        taskClaimed = true;
                        currentUser.points = newPoints;

                        displayPoints.textContent = currentUser.points;
                        displayPosition.textContent = `#${await calculatePosition(currentUser)}`;

                        claimButton.textContent = 'Claimed';
                        claimButton.classList.add('disabled');
                        claimButton.setAttribute('disabled', 'true');
                        console.log('Claim button marked as Claimed');
                    }
                });
            }

            const copyReferralButton = document.getElementById('copyReferralButton');
            if (copyReferralButton) {
                copyReferralButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(currentUser.referral_link || '')
                        .then(() => alert('Referral link copied to clipboard!'))
                        .catch(() => alert('Failed to copy referral link.'));
                });
            }
        } else {
            window.location.href = 'login.html';
        }
    }

    // Logout Logic
    const logoutButton = document.querySelector('.logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('currentUserEmail');
            window.location.href = 'login.html';
        });
    }
});
