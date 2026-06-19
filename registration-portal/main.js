// Solve For India - Registration Logic

const form = document.getElementById("registration-form");
const successScreen = document.getElementById("success-screen");
const submitBtn = document.getElementById("submit-btn");
const teamNameGroup = document.getElementById("team-name-group");
const teamSizeRadios = document.querySelectorAll('input[name="teamSize"]');

// Get Supabase credentials directly from Vite environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_URL.includes("your-project")) {
  console.error(
    "[Registration Portal] ❌ ERROR: Supabase credentials not configured!",
  );
  console.error(
    "[Registration Portal] Please configure env-config.js with your Supabase credentials.",
  );
  console.error(
    "[Registration Portal] Get these from: https://supabase.com/dashboard -> Settings -> API",
  );

  // Show error message to user
  const formElem = document.getElementById("registration-form");
  if (formElem) {
    formElem.innerHTML = `
      <div style="padding: 20px; background: #fee; border: 1px solid #fcc; border-radius: 8px; color: #c33; margin: 20px 0;">
        <strong>⚠️ Configuration Error</strong><br/>
        Registration is temporarily unavailable. The portal needs to be configured with Supabase credentials.
        <br/><br/>
        <small>Contact: supportrepdox@gmail.com</small>
      </div>
    `;
  }
} else {
  console.log(
    "[Registration Portal] ✅ Supabase configured for:",
    SUPABASE_URL,
  );
}

let supabaseClient = null;
if (
  typeof window.supabase !== "undefined" &&
  window.supabase.createClient &&
  SUPABASE_URL &&
  SUPABASE_KEY &&
  !SUPABASE_URL.includes("your-project")
) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log("[Registration Portal] ✅ Supabase client initialized");
} else if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "[Registration Portal] Supabase credentials not configured. Configure env-config.js",
  );
} else {
  console.error(
    "[Registration Portal] Supabase library not loaded. Check CDN script inclusion.",
  );
}

// Toggle Team Name Visibility
teamSizeRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "Duo") {
      teamNameGroup.classList.remove("hidden");
    } else {
      teamNameGroup.classList.add("hidden");
    }
  });
});

// Enforce exactly 10 digits in phone input
const phoneInput = document.getElementById("phone");
if (phoneInput) {
  phoneInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
  });
}

// Form Submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  submitBtn.classList.add("loading");
  submitBtn.disabled = true;

  const formData = new FormData(form);
  const rawData = Object.fromEntries(formData.entries());

  try {
    if (!supabaseClient) {
      // If Supabase isn't ready (e.g. no keys), simulate for demo
      console.warn("Supabase not initialized. Simulating success...");
      await new Promise((r) => setTimeout(r, 2000));
    } else {
      // 1. Automatically fetch the latest event from your database
      const { data: latestEvent, error: eventError } = await supabaseClient
        .from("events")
        .select("id, slug")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (eventError || !latestEvent)
        throw new Error(
          "No events found in your database. Please create an event first!",
        );

      let tableName = "event_registrations";
      if (latestEvent.slug) {
        let formattedSlug = latestEvent.slug.toLowerCase().replace(/[- ]/g, "_");
        if (formattedSlug === "solveforindia2026") {
          formattedSlug = "solveforindia";
        }
        tableName = `event_reg_${formattedSlug}`;
      } else if (latestEvent.id) {
        tableName = `event_reg_${latestEvent.id.replace(/-/g, "_")}`;
      }

      const cleanName = String(rawData.name || '').trim();
      const cleanEmail = String(rawData.email || '').trim();
      const cleanPhone = String(rawData.phone || '').replace(/[`'"]/g, '').trim();

      // Check if email already registered for this event to prevent duplicates
      const { data: existingReg, error: checkError } = await supabaseClient
        .from(tableName)
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingReg) {
        throw new Error("You have already registered with this email address!");
      }

      // 2. Prepare Registration Data
      const registration = {
        event_id: latestEvent.id,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        school: rawData.school || null,
        stream: rawData.stream || null,
        year: rawData.grade || null, // Map grade to year to match main app
        participation_mode: rawData.teamSize || 'Solo',
        message: rawData.teamName ? JSON.stringify({ teamName: String(rawData.teamName).trim() }) : null,
        motivation: rawData.motivation || null,
        github: rawData.github || null,
        linkedin: rawData.linkedin || null,
        role: "participant",
        status: "registered"
      };

      // 3. Insert
      const { error: insertError } = await supabaseClient
        .from(tableName)
        .insert([registration]);

      if (insertError) {
        if (
          insertError.code === "23505" ||
          insertError.message.includes("unique")
        ) {
          throw new Error(
            "You have already registered with this email address!",
          );
        }
        throw insertError;
      }
    }

    // On Success
    form.classList.add("hidden");
    if (document.querySelector(".header"))
      document.querySelector(".header").classList.add("hidden");
    successScreen.classList.remove("hidden");

    // 5 Second Redirect
    let timeLeft = 5;
    const countdownEl = document.getElementById("countdown");
    if (countdownEl) {
      const timer = setInterval(() => {
        timeLeft--;
        countdownEl.textContent = timeLeft;
        if (timeLeft <= 0) {
          clearInterval(timer);
          window.location.href = "https://repdox.com";
        }
      }, 1000);
    }
  } catch (error) {
    console.error("Submission error:", error);
    alert(
      `Registration failed: ${error.message}. Please contact supportrepdox@gmail.com`,
    );
  } finally {
    submitBtn.classList.remove("loading");
    submitBtn.disabled = false;
  }
});
