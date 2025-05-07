document.addEventListener('DOMContentLoaded', async () => {
    // Fetch Supabase credentials from API
    let SUPABASE_URL, SUPABASE_KEY;
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to fetch Supabase config');
        const config = await response.json();
        SUPABASE_URL = config.SUPABASE_URL;
        SUPABASE_KEY = config.SUPABASE_KEY;
    } catch (error) {
        console.error('Error fetching Supabase credentials:', error);
        alert('Failed to initialize the app. Please try again later.');
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
        // Sort users by points (descending)
        const sortedUsers = [...users].sort((a, b) => (b.points || 0) - (a.points || 0));
        // Find the index of the current user in the sorted array (position is index + 1)
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

        const validateForm = () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            const solanaWallet = solanaWalletInput.value;
            const twitter = twitterInput.value;
            const termsChecked = termsCheckbox.checked;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isEmailValid = emailRegex.test(email);
            const isPasswordValid = password.length >= 8;
            const isSolanaWalletValid = solanaWallet.length >= 37;
            const isTwitterValid = twitter.length > 0;

            if (isEmailValid && isPasswordValid && isSolanaWalletValid && isTwitterValid && termsChecked) {
                joinButton.classList.remove('disabled');
                joinButton.removeAttribute('disabled');
            } else {
                joinButton.classList.add('disabled');
                joinButton.setAttribute('disabled', 'disabled');
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

            const email = emailInput.value;
            const password = passwordInput.value;
            const solanaWallet = solanaWalletInput.value;
            const twitter = twitterInput.value;
            const inviteCode = inviteCodeInput.value;

            // Check if email already exists
            const users = await getUsers();
            if (users.some(user => user.email === email)) {
                alert('Email already registered. Please log in.');
                window.location.href = 'login.html';
                return;
            }

            const referralCode = generateReferralCode();
            const referralLink = `https://ignite-xyz.vercel.app/ref/${referralCode}`;

            // Create new user
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

            // Insert new user into Supabase
            const { error: insertError } = await supabase
                .from('users')
                .insert(newUser);
            if (insertError) {
                console.error('Error registering user:', insertError);
                alert('Registration failed. Please try again.');
                return;
            }

            // Handle invite code (referral)
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

            // Set current user in sessionStorage
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

        const validateLoginForm = () => {
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isEmailValid = emailRegex.test(email);
            const isPasswordValid = password.length >= 8;

            if (isEmailValid && isPasswordValid) {
                loginButton.classList.remove('disabled');
                loginButton.removeAttribute('disabled');
            } else {
                loginButton.classList.add('disabled');
                loginButton.setAttribute('disabled', 'disabled');
            }
        };

        loginEmailInput.addEventListener('input', validateLoginForm);
        loginPasswordInput.addEventListener('input', validateLoginForm);

        validateLoginForm();

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;

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
            // Display email
            displayEmail.textContent = currentUser.email || 'Not provided';

            // Calculate and display position
            const position = await calculatePosition(currentUser);
            displayPosition.textContent = `#${position}`;

            // Display points and referrals
            displayPoints.textContent = currentUser.points || '0';
            displayReferrals.textContent = currentUser.referrals || '0';

            // Display referral code
            displayReferralCode.textContent = currentUser.referral_link || 'Not provided';

            // Task and Claim Logic
            const tasks = [
                { taskId: 'twitterTask', claimId: 'twitterClaim', key: 'twitterTaskCompleted' },
                { taskId: 'telegramTask', claimId: 'telegramClaim', key: 'telegramTaskCompleted' },
                { taskId: 'telegram2Task', claimId: 'telegram2Claim', key: 'telegram2TaskCompleted' },
                { taskId: 'discordTask', claimId: 'discordClaim', key: 'discordTaskCompleted' }
            ];

            for (const task of tasks) {
                const taskButton = document.getElementById(task.taskId);
                const claimButton = document.getElementById(task.claimId);

                // Check task status from Supabase
                const { data: taskData, error: taskError } = await supabase
                    .from('tasks')
                    .select('completed, claimed')
                    .eq('user_email', currentUser.email)
                    .eq('task_key', task.key)
                    .single();

                let taskCompleted = taskData?.completed || false;
                let taskClaimed = taskData?.claimed || false;

                // If task is claimed, set button to "Claimed" and disable
                if (taskClaimed) {
                    claimButton.textContent = 'Claimed';
                    claimButton.classList.add('disabled');
                    claimButton.setAttribute('disabled', 'disabled');
                } else if (taskCompleted) {
                    // If task is completed but not claimed, enable claim button
                    claimButton.classList.remove('disabled');
                    claimButton.removeAttribute('disabled');
                }

                // Task button click handler
                taskButton.addEventListener('click', async () => {
                    // Mark task as completed in Supabase
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

                    // Enable claim button
                    claimButton.classList.remove('disabled');
                    claimButton.removeAttribute('disabled');
                });

                // Claim button click handler
                claimButton.addEventListener('click', async () => {
                    if (!taskClaimed) {
                        // Add 10 points
                        const newPoints = (currentUser.points || 0) + 10;
                        const updateSuccess = await updateUser({ ...currentUser, points: newPoints });
                        if (!updateSuccess) {
                            alert('Failed to claim points. Please try again.');
                            return;
                        }

                        // Mark task as claimed in Supabase
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

                        // Update current user
                        currentUser.points = newPoints;

                        // Update display
                        displayPoints.textContent = currentUser.points;
                        displayPosition.textContent = `#${await calculatePosition(currentUser)}`;

                        // Update button state
                        claimButton.textContent = 'Claimed';
                        claimButton.classList.add('disabled');
                        claimButton.setAttribute('disabled', 'disabled');
                    }
                });
            }

            // Copy Referral Link
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