// Solve For India - Registration Logic

const form = document.getElementById('registration-form');
const successScreen = document.getElementById('success-screen');
const submitBtn = document.getElementById('submit-btn');
const teamNameGroup = document.getElementById('team-name-group');
const teamSizeRadios = document.querySelectorAll('input[name="teamSize"]');

// 1. UPDATE THESE WITH YOUR REAL KEYS FROM SUPABASE DASHBOARD
const SUPABASE_URL = 'https://igghkfselpqlyktsiulj.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZ2hrZnNlbHBxbHlrdHNpdWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODg0ODYsImV4cCI6MjA3ODE2NDQ4Nn0.w1X14pRoEc_2UnPThdLInaWZVDvaMDTKCB4qm2frykE'; 

let supabaseClient = null;
if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Toggle Team Name Visibility
teamSizeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'Duo') {
            teamNameGroup.classList.remove('hidden');
        } else {
            teamNameGroup.classList.add('hidden');
        }
    });
});

// Form Submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    const formData = new FormData(form);
    const rawData = Object.fromEntries(formData.entries());
    
    try {
        if (!supabaseClient) {
            // If Supabase isn't ready (e.g. no keys), simulate for demo
            console.warn('Supabase not initialized. Simulating success...');
            await new Promise(r => setTimeout(r, 2000));
        } else {
            // 1. Automatically fetch the latest event from your database
            const { data: latestEvent, error: eventError } = await supabaseClient
                .from('events')
                .select('id')
                .limit(1)
                .single();

            if (eventError || !latestEvent) throw new Error('No events found in your database. Please create an event first!');

            // 2. Prepare Registration Data
            const registration = {
                event_id: latestEvent.id,
                name: rawData.name,
                email: rawData.email,
                phone: rawData.phone,
                message: JSON.stringify({
                    school: rawData.school,
                    stream: rawData.stream,
                    grade: rawData.grade,
                    teamSize: rawData.teamSize,
                    teamName: rawData.teamName,
                    motivation: rawData.motivation,
                    links: {
                        github: rawData.github,
                        linkedin: rawData.linkedin
                    }
                })
            };

            // 3. Insert
            const { error: insertError } = await supabaseClient
                .from('event_registrations')
                .insert([registration]);

            if (insertError) {
                if (insertError.code === '23505' || insertError.message.includes('unique')) {
                    throw new Error('You have already registered with this email address!');
                }
                throw insertError;
            }
        }

        // On Success
        form.classList.add('hidden');
        if (document.querySelector('.header')) document.querySelector('.header').classList.add('hidden');
        successScreen.classList.remove('hidden');

        // 5 Second Redirect
        let timeLeft = 5;
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
            const timer = setInterval(() => {
                timeLeft--;
                countdownEl.textContent = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    window.location.href = 'https://repdox.com';
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('Submission error:', error);
        alert(`Registration failed: ${error.message}. Please contact supportrepdox@gmail.com`);
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
});
