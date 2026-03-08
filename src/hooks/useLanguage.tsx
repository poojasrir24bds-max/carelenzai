import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "en" | "ta";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Lang, string>> = {
  // Common
  "app.name": { en: "CARELENZ AI", ta: "CARELENZ AI" },
  "common.back": { en: "Back", ta: "பின்" },
  "common.submit": { en: "Submit", ta: "சமர்ப்பி" },
  "common.loading": { en: "Loading...", ta: "ஏற்றுகிறது..." },
  "common.cancel": { en: "Cancel", ta: "ரத்து" },

  // Index / Landing
  "index.badge": { en: "AI-Powered Health Awareness", ta: "AI-இயக்கப்படும் சுகாதார விழிப்புணர்வு" },
  "index.hero.title1": { en: "Your Health,", ta: "உங்கள் ஆரோக்கியம்," },
  "index.hero.title2": { en: "Scanned & Analyzed", ta: "ஸ்கேன் & பகுப்பாய்வு" },
  "index.hero.desc": { en: "Upload or scan body features to detect possible health conditions. Get AI-powered insights and connect with verified specialists.", ta: "சாத்தியமான உடல்நிலைகளைக் கண்டறிய உடல் அம்சங்களை பதிவேற்றவும் அல்லது ஸ்கேன் செய்யவும். AI-இயக்கப்படும் நுண்ணறிவுகளைப் பெறுங்கள்." },
  "index.getStarted": { en: "Get Started", ta: "தொடங்குங்கள்" },
  "index.selectRole": { en: "Select your role to continue", ta: "தொடர உங்கள் பங்கைத் தேர்ந்தெடுக்கவும்" },
  "index.disclaimer": { en: "⚠️ Medical Disclaimer: This platform provides health awareness only and does NOT provide medical diagnosis or prescriptions. Always consult a qualified healthcare professional for medical advice.", ta: "⚠️ மருத்துவ மறுப்பு: இந்த தளம் சுகாதார விழிப்புணர்வை மட்டுமே வழங்குகிறது, மருத்துவ நோயறிதல் அல்லது மருந்து சீட்டுகளை வழங்காது. மருத்துவ ஆலோசனைக்கு எப்போதும் தகுதிவாய்ந்த சுகாதார நிபுணரை அணுகவும்." },
  "index.feat.scan": { en: "AI Body Scan", ta: "AI உடல் ஸ்கேன்" },
  "index.feat.scan.desc": { en: "Analyze skin, hair, eyes, nails & more", ta: "தோல், முடி, கண்கள், நகங்கள் மற்றும் பலவற்றை பகுப்பாய்வு செய்யுங்கள்" },
  "index.feat.insights": { en: "Health Insights", ta: "ஆரோக்கிய நுண்ணறிவுகள்" },
  "index.feat.insights.desc": { en: "Get severity analysis and guidance", ta: "தீவிர பகுப்பாய்வு மற்றும் வழிகாட்டுதலைப் பெறுங்கள்" },
  "index.feat.doctor": { en: "Doctor Connect", ta: "மருத்துவர் இணைப்பு" },
  "index.feat.doctor.desc": { en: "Match with specialists instantly", ta: "நிபுணர்களுடன் உடனடியாக இணையுங்கள்" },
  "index.feat.track": { en: "Track Progress", ta: "முன்னேற்றம் கண்காணி" },
  "index.feat.track.desc": { en: "Monitor your health over time", ta: "உங்கள் ஆரோக்கியத்தை காலப்போக்கில் கண்காணிக்கவும்" },

  // Roles
  "role.patient": { en: "Patient", ta: "நோயாளி" },
  "role.doctor": { en: "Doctor", ta: "மருத்துவர்" },
  "role.admin": { en: "Admin", ta: "நிர்வாகி" },
  "role.patient.desc": { en: "Scan symptoms, get health insights, and connect with doctors", ta: "அறிகுறிகளை ஸ்கேன் செய்யுங்கள், ஆரோக்கிய நுண்ணறிவுகளைப் பெறுங்கள், மருத்துவர்களுடன் இணையுங்கள்" },
  "role.doctor.desc": { en: "Manage consultations, view patient scans, and provide guidance", ta: "ஆலோசனைகளை நிர்வகிக்கவும், நோயாளி ஸ்கேன்களைப் பாருங்கள்" },
  "role.admin.desc": { en: "Full platform control, manage users, doctors, and analytics", ta: "முழு தளக் கட்டுப்பாடு, பயனர்கள், மருத்துவர்களை நிர்வகிக்கவும்" },

  // Login
  "login.title": { en: "Login", ta: "உள்நுழைவு" },
  "login.signIn": { en: "Sign in to your account", ta: "உங்கள் கணக்கில் உள்நுழையவும்" },
  "login.email": { en: "Email", ta: "மின்னஞ்சல்" },
  "login.password": { en: "Password", ta: "கடவுச்சொல்" },
  "login.signingIn": { en: "Signing in...", ta: "உள்நுழைகிறது..." },
  "login.signInBtn": { en: "Sign In", ta: "உள்நுழை" },
  "login.noAccount": { en: "Don't have an account?", ta: "கணக்கு இல்லையா?" },
  "login.register": { en: "Register", ta: "பதிவு செய்" },
  "login.forgotPassword": { en: "Forgot Password?", ta: "கடவுச்சொல் மறந்துவிட்டதா?" },

  // Forgot Password
  "forgot.title": { en: "Forgot Password", ta: "கடவுச்சொல் மறந்துவிட்டது" },
  "forgot.desc": { en: "Enter your email to receive a reset link", ta: "மீட்டமைப்பு இணைப்பைப் பெற உங்கள் மின்னஞ்சலை உள்ளிடவும்" },
  "forgot.sendBtn": { en: "Send Reset Link", ta: "மீட்டமைப்பு இணைப்பை அனுப்பு" },
  "forgot.sent": { en: "Reset link sent! Check your email.", ta: "மீட்டமைப்பு இணைப்பு அனுப்பப்பட்டது! உங்கள் மின்னஞ்சலைச் சரிபார்க்கவும்." },
  "forgot.checkEmail": { en: "We've sent a password reset link to your email. Please check your inbox and spam folder.", ta: "உங்கள் மின்னஞ்சலுக்கு கடவுச்சொல் மீட்டமைப்பு இணைப்பை அனுப்பியுள்ளோம். உங்கள் இன்பாக்ஸ் மற்றும் ஸ்பேம் கோப்புறையைச் சரிபார்க்கவும்." },
  "forgot.failed": { en: "Failed to send reset link", ta: "மீட்டமைப்பு இணைப்பை அனுப்ப முடியவில்லை" },

  // Reset Password
  "reset.title": { en: "Reset Password", ta: "கடவுச்சொல்லை மீட்டமை" },
  "reset.desc": { en: "Enter your new password", ta: "உங்கள் புதிய கடவுச்சொல்லை உள்ளிடவும்" },
  "reset.newPassword": { en: "New Password", ta: "புதிய கடவுச்சொல்" },
  "reset.confirmPassword": { en: "Confirm Password", ta: "கடவுச்சொல்லை உறுதிப்படுத்து" },
  "reset.updateBtn": { en: "Update Password", ta: "கடவுச்சொல்லைப் புதுப்பி" },
  "reset.mismatch": { en: "Passwords do not match", ta: "கடவுச்சொற்கள் பொருந்தவில்லை" },
  "reset.minLength": { en: "Password must be at least 6 characters", ta: "கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்" },
  "reset.success": { en: "Password updated successfully!", ta: "கடவுச்சொல் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!" },
  "reset.failed": { en: "Failed to update password", ta: "கடவுச்சொல்லைப் புதுப்பிக்க முடியவில்லை" },
  "reset.invalidLink": { en: "Invalid or expired reset link. Please request a new one.", ta: "தவறான அல்லது காலாவதியான மீட்டமைப்பு இணைப்பு. புதிய ஒன்றைக் கோருங்கள்." },

  // Register
  "register.title": { en: "Registration", ta: "பதிவு" },
  "register.createAccount": { en: "Create your account", ta: "உங்கள் கணக்கை உருவாக்குங்கள்" },
  "register.submitApproval": { en: "Submit for admin approval", ta: "நிர்வாக ஒப்புதலுக்கு சமர்ப்பிக்கவும்" },
  "register.adminRestricted": { en: "Limited to authorized emails only", ta: "அங்கீகரிக்கப்பட்ட மின்னஞ்சல்களுக்கு மட்டும்" },
  "register.fullName": { en: "Full Name", ta: "முழு பெயர்" },
  "register.age": { en: "Age", ta: "வயது" },
  "register.sex": { en: "Sex", ta: "பாலினம்" },
  "register.male": { en: "Male", ta: "ஆண்" },
  "register.female": { en: "Female", ta: "பெண்" },
  "register.other": { en: "Other", ta: "மற்றவை" },
  "register.select": { en: "Select", ta: "தேர்ந்தெடு" },
  "register.license": { en: "Medical License Number", ta: "மருத்துவ உரிம எண்" },
  "register.doctorId": { en: "Doctor ID", ta: "மருத்துவர் ID" },
  "register.specialization": { en: "Specialization", ta: "நிபுணத்துவம்" },
  "register.hospital": { en: "Hospital / Clinic Name", ta: "மருத்துவமனை / கிளினிக் பெயர்" },
  "register.processing": { en: "Processing...", ta: "செயலாக்குகிறது..." },
  "register.submitForApproval": { en: "Submit for Approval", ta: "ஒப்புதலுக்கு சமர்ப்பி" },
  "register.createAccountBtn": { en: "Create Account", ta: "கணக்கை உருவாக்கு" },
  "register.haveAccount": { en: "Already have an account?", ta: "ஏற்கனவே கணக்கு உள்ளதா?" },
  "register.signIn": { en: "Sign In", ta: "உள்நுழை" },
  "register.adminWarning": { en: "⚠️ Admin registration is restricted to 5 pre-authorized email addresses only. Contact the system administrator if you need access.", ta: "⚠️ நிர்வாக பதிவு 5 முன்-அங்கீகரிக்கப்பட்ட மின்னஞ்சல் முகவரிகளுக்கு மட்டுமே. அணுகல் தேவைப்பட்டால் கணினி நிர்வாகியைத் தொடர்பு கொள்ளுங்கள்." },
  "register.dermatologist": { en: "Dermatologist", ta: "தோல் மருத்துவர்" },
  "register.trichologist": { en: "Trichologist", ta: "முடி மருத்துவர்" },
  "register.ophthalmologist": { en: "Ophthalmologist", ta: "கண் மருத்துவர்" },
  "register.general": { en: "General Physician", ta: "பொது மருத்துவர்" },
  "register.dentist": { en: "Dentist", ta: "பல் மருத்துவர்" },
  "register.address": { en: "Address", ta: "முகவரி" },
  "register.addressPlaceholder": { en: "Enter your full address", ta: "உங்கள் முழு முகவரியை உள்ளிடவும்" },

  // Patient Dashboard
  "patient.hello": { en: "Hello,", ta: "வணக்கம்," },
  "patient.howFeeling": { en: "How are you feeling today?", ta: "இன்று எப்படி உணர்கிறீர்கள்?" },
  "patient.selectScan": { en: "Select & Scan", ta: "தேர்ந்தெடு & ஸ்கேன்" },
  "patient.tapToScan": { en: "Tap an area to start scanning", ta: "ஸ்கேன் செய்ய ஒரு பகுதியைத் தட்டவும்" },
  "patient.askQuestion": { en: "Ask a Health Question", ta: "ஒரு சுகாதார கேள்வி கேளுங்கள்" },
  "patient.askQuestionDesc": { en: "Type your health question. AI will answer instantly, and a doctor may also review.", ta: "உங்கள் சுகாதார கேள்வியை தட்டச்சு செய்யவும். AI உடனடியாக பதிலளிக்கும், மருத்துவரும் மதிப்பாய்வு செய்யலாம்." },
  "patient.questionPlaceholder": { en: "e.g., Why does my skin feel itchy after sun exposure?", ta: "எ.கா., சூரிய ஒளியில் ஏன் என் தோல் அரிப்பு ஏற்படுகிறது?" },
  "patient.submitQuestion": { en: "Submit Question", ta: "கேள்வியை சமர்ப்பி" },
  "patient.submitting": { en: "Submitting...", ta: "சமர்ப்பிக்கிறது..." },
  "patient.recentQuestions": { en: "Your recent questions:", ta: "உங்கள் சமீபத்திய கேள்விகள்:" },
  "patient.aiResponse": { en: "🤖 AI Response:", ta: "🤖 AI பதில்:" },
  "patient.doctorResponse": { en: "👩‍⚕️ Doctor's Response:", ta: "👩‍⚕️ மருத்துவர் பதில்:" },
  "patient.gettingAI": { en: "⏳ Getting AI response...", ta: "⏳ AI பதில் பெறுகிறது..." },
  "patient.doctorMayReview": { en: "💡 A doctor may also review this", ta: "💡 ஒரு மருத்துவரும் இதை மதிப்பாய்வு செய்யலாம்" },
  "patient.recentScans": { en: "Recent Scans", ta: "சமீபத்திய ஸ்கேன்கள்" },
  "patient.viewAll": { en: "View All", ta: "அனைத்தையும் காண்" },
  "patient.noScans": { en: "No previous scans found. Start your first scan above!", ta: "முந்தைய ஸ்கேன்கள் இல்லை. மேலே உங்கள் முதல் ஸ்கேனைத் தொடங்குங்கள்!" },
  "patient.scan": { en: "Scan", ta: "ஸ்கேன்" },
  "patient.findDoctor": { en: "Find Doctor", ta: "மருத்துவர் கண்டுபிடி" },
  "patient.availableDoctors": { en: "Available Doctors", ta: "கிடைக்கும் மருத்துவர்கள்" },
  "patient.noDoctorsYet": { en: "No verified doctors available yet.", ta: "சரிபார்க்கப்பட்ட மருத்துவர்கள் இன்னும் இல்லை." },
  "patient.verified": { en: "Verified", ta: "சரிபார்க்கப்பட்டது" },
  "patient.appointments": { en: "Appointments", ta: "நேர நிர்ணயங்கள்" },
  "patient.profile": { en: "Profile", ta: "சுயவிவரம்" },
  "patient.videoCall": { en: "Video Call", ta: "வீடியோ அழைப்பு" },
  "patient.activeConsultations": { en: "Active Consultations", ta: "செயலில் ஆலோசனைகள்" },
  "patient.videoConsultation": { en: "Video Consultation", ta: "வீடியோ ஆலோசனை" },
  "patient.waitingDoctor": { en: "Waiting for doctor to accept...", ta: "மருத்துவர் ஏற்க காத்திருக்கிறது..." },
  "patient.doctorAccepted": { en: "Doctor accepted! Join now.", ta: "மருத்துவர் ஏற்றுக்கொண்டார்! இப்போது சேரவும்." },
  "patient.joinCall": { en: "Join Call", ta: "அழைப்பில் சேர" },
  "patient.pending": { en: "Pending", ta: "நிலுவையில்" },
  "patient.noDoctorAvailable": { en: "No verified doctor available at the moment.", ta: "தற்போது சரிபார்க்கப்பட்ட மருத்துவர் இல்லை." },
  "patient.consultationRequested": { en: "Video consultation requested! Waiting for doctor.", ta: "வீடியோ ஆலோசனை கோரப்பட்டது! மருத்துவருக்காக காத்திருக்கிறது." },
  "patient.lowRisk": { en: "Low Risk", ta: "குறைந்த ஆபத்து" },
  "patient.mediumRisk": { en: "Medium Risk", ta: "நடுத்தர ஆபத்து" },
  "patient.highRisk": { en: "High Risk", ta: "அதிக ஆபத்து" },

  // Scan areas
  "area.dental": { en: "Dental", ta: "பல்" },
  "area.skin": { en: "Skin", ta: "தோல்" },
  "area.hair": { en: "Hair", ta: "முடி" },
  "area.eyes": { en: "Eyes", ta: "கண்கள்" },
  "area.nails": { en: "Nails", ta: "நகங்கள்" },
  "area.lips": { en: "Lips", ta: "உதடுகள்" },
  "area.scalp": { en: "Scalp", ta: "உச்சந்தலை" },

  // Scan Page
  "scan.title": { en: "AI Health Scan", ta: "AI ஆரோக்கிய ஸ்கேன்" },
  "scan.selectArea": { en: "Select Scan Area", ta: "ஸ்கேன் பகுதியைத் தேர்ந்தெடுக்கவும்" },
  "scan.upload": { en: "Upload", ta: "பதிவேற்று" },
  "scan.camera": { en: "Camera", ta: "கேமரா" },
  "scan.uploadImage": { en: "Upload", ta: "பதிவேற்று" },
  "scan.tapToSelect": { en: "Tap to select from gallery", ta: "கேலரியிலிருந்து தேர்ந்தெடுக்க தட்டவும்" },
  "scan.analyzing": { en: "Analyzing", ta: "பகுப்பாய்வு செய்கிறது" },
  "scan.aiProcessing": { en: "AI is processing your image", ta: "AI உங்கள் படத்தை செயலாக்குகிறது" },
  "scan.analyze": { en: "Analyze", ta: "பகுப்பாய்வு செய்" },
  "scan.disclaimer": { en: "⚠️ AI Screening Only: This is an AI screening tool. No prescription is generated automatically; only a verified doctor can provide medical advice and prescriptions.", ta: "⚠️ AI திரையிடல் மட்டுமே: இது ஒரு AI திரையிடல் கருவி. மருந்து சீட்டு தானாக உருவாக்கப்படாது; சரிபார்க்கப்பட்ட மருத்துவர் மட்டுமே மருத்துவ ஆலோசனை வழங்க முடியும்." },
  "scan.tips": { en: "📸 Tips for Best Results", ta: "📸 சிறந்த முடிவுகளுக்கான குறிப்புகள்" },
  "scan.tip1": { en: "Ensure good, natural lighting", ta: "நல்ல, இயற்கை வெளிச்சம் உறுதி செய்யுங்கள்" },
  "scan.tip2": { en: "Keep 15-30cm distance from area", ta: "பகுதியிலிருந்து 15-30 செ.மீ தூரத்தை வைக்கவும்" },
  "scan.tip3": { en: "Hold steady for clear focus", ta: "தெளிவான கவனத்திற்கு நிலையாக பிடிக்கவும்" },

  // Scan Results
  "results.title": { en: "Scan Results", ta: "ஸ்கேன் முடிவுகள்" },
  "results.noResults": { en: "No scan results available.", ta: "ஸ்கேன் முடிவுகள் இல்லை." },
  "results.goToScan": { en: "Go to Scan", ta: "ஸ்கேன் செய்ய செல்" },
  "results.confidence": { en: "confidence", ta: "நம்பகத்தன்மை" },
  "results.listen": { en: "🔊 Listen", ta: "🔊 கேளுங்கள்" },
  "results.pause": { en: "Pause", ta: "இடைநிறுத்து" },
  "results.whatIs": { en: "What is", ta: "என்றால் என்ன" },
  "results.causes": { en: "Possible Causes", ta: "சாத்தியமான காரணங்கள்" },
  "results.guidance": { en: "Health Guidance", ta: "சுகாதார வழிகாட்டுதல்" },
  "results.askQuestion": { en: "Ask a Question", ta: "கேள்வி கேளுங்கள்" },
  "results.askQuestionDesc": { en: "Have doubts about your diagnosis? Ask here and a doctor will review your question.", ta: "உங்கள் கண்டறிதல் பற்றி சந்தேகங்கள் உள்ளதா? இங்கே கேளுங்கள், மருத்துவர் பதிலளிப்பார்." },
  "results.questionPlaceholder": { en: "Type your question about the diagnosis...", ta: "கண்டறிதல் பற்றிய உங்கள் கேள்வியை தட்டச்சு செய்யவும்..." },
  "results.submitQuestion": { en: "Submit Question", ta: "கேள்வியை சமர்ப்பிக்கவும்" },
  "results.submitting": { en: "Submitting...", ta: "சமர்ப்பிக்கிறது..." },
  "results.gettingAI": { en: "Getting AI response...", ta: "AI பதில் பெறுகிறது..." },
  "results.aiResponse": { en: "AI Response:", ta: "AI பதில்:" },
  "results.doctorMayReview": { en: "A doctor may also review this", ta: "ஒரு மருத்துவரும் இதை மதிப்பாய்வு செய்யலாம்" },
  "results.recommendedDoctors": { en: "Recommended Doctors", ta: "பரிந்துரைக்கப்பட்ட மருத்துவர்கள்" },
  "results.noDoctors": { en: "No verified doctors available at the moment.", ta: "தற்போது சரிபார்க்கப்பட்ட மருத்துவர்கள் இல்லை." },
  "results.book": { en: "Book", ta: "முன்பதிவு" },
  "results.disclaimer": { en: "⚠️ This is AI-powered health screening only, not a medical diagnosis. No prescription is generated automatically. Always consult a healthcare professional.", ta: "⚠️ இது AI உடல்நல திரையிடல் மட்டுமே, மருத்துவ கண்டறிதல் அல்ல. எப்போதும் சுகாதார நிபுணரை அணுகவும்." },
  "results.lowRisk": { en: "🟢 Low Risk", ta: "🟢 குறைந்த ஆபத்து" },
  "results.mediumRisk": { en: "🟡 Medium Risk", ta: "🟡 நடுத்தர ஆபத்து" },
  "results.highRisk": { en: "🔴 High Risk", ta: "🔴 அதிக ஆபத்து" },
  "results.lowDesc": { en: "Normal or mild issue — no immediate concern", ta: "இயல்பான அல்லது லேசான பிரச்சனை — உடனடி கவலை இல்லை" },
  "results.mediumDesc": { en: "Monitor condition and consider a doctor consultation", ta: "நிலையை கண்காணித்து மருத்துவர் ஆலோசனையை பரிசீலிக்கவும்" },
  "results.highDesc": { en: "Doctor consultation recommended immediately", ta: "உடனடியாக மருத்துவர் ஆலோசனை பரிந்துரைக்கப்படுகிறது" },

  // Subscription
  "sub.title": { en: "Subscription Plans", ta: "சந்தா திட்டங்கள்" },
  "sub.activePlan": { en: "Active Subscription", ta: "செயலில் சந்தா" },
  "sub.expires": { en: "Expires:", ta: "காலாவதி:" },
  "sub.scansUsed": { en: "Scans Used", ta: "பயன்படுத்திய ஸ்கேன்கள்" },
  "sub.consultationsUsed": { en: "Consultations Used", ta: "பயன்படுத்திய ஆலோசனைகள்" },
  "sub.choosePlan": { en: "Choose Your Plan", ta: "உங்கள் திட்டத்தைத் தேர்ந்தெடுக்கவும்" },
  "sub.choosePlanDesc": { en: "Select a plan to unlock AI scans and doctor consultations", ta: "AI ஸ்கேன்கள் மற்றும் மருத்துவர் ஆலோசனைகளைத் திறக்க ஒரு திட்டத்தைத் தேர்ந்தெடுக்கவும்" },
  "sub.popular": { en: "POPULAR", ta: "பிரபலமான" },
  "sub.plan": { en: "Plan", ta: "திட்டம்" },
  "sub.month": { en: "month", ta: "மாதம்" },
  "sub.aiScans": { en: "AI Health Scans", ta: "AI ஆரோக்கிய ஸ்கேன்கள்" },
  "sub.doctorConsultations": { en: "Doctor Video Consultations", ta: "மருத்துவர் வீடியோ ஆலோசனைகள்" },
  "sub.days": { en: "days validity", ta: "நாட்கள் செல்லுபடியாகும்" },
  "sub.prioritySupport": { en: "Priority Support", ta: "முன்னுரிமை ஆதரவு" },
  "sub.payWithUpi": { en: "Pay with UPI", ta: "UPI மூலம் செலுத்து" },
  "sub.confirmPayment": { en: "Confirm Payment", ta: "பணம் செலுத்துதலை உறுதிப்படுத்தவும்" },
  "sub.confirmPaymentDesc": { en: "After paying via UPI, enter the transaction ID to activate your", ta: "UPI மூலம் பணம் செலுத்திய பிறகு, உங்கள் திட்டத்தை செயல்படுத்த பரிவர்த்தனை ID-ஐ உள்ளிடவும்" },
  "sub.transactionId": { en: "UPI Transaction ID / Reference Number", ta: "UPI பரிவர்த்தனை ID / குறிப்பு எண்" },
  "sub.transactionIdHint": { en: "Find this in your UPI app payment history", ta: "உங்கள் UPI ஆப் பணம் செலுத்தும் வரலாற்றில் இதைக் கண்டறியவும்" },
  "sub.submitPayment": { en: "Submit & Activate", ta: "சமர்ப்பித்து செயல்படுத்து" },
  "sub.submitted": { en: "Payment submitted!", ta: "பணம் செலுத்தப்பட்டது!" },
  "sub.submittedDesc": { en: "Admin will verify and activate your plan shortly.", ta: "நிர்வாகி விரைவில் உங்கள் திட்டத்தை சரிபார்த்து செயல்படுத்துவார்." },
  "sub.upiInfo": { en: "UPI Payment ID:", ta: "UPI கட்டண ID:" },
  "sub.adminApproval": { en: "Payments are verified by admin within 24 hours", ta: "கட்டணங்கள் 24 மணி நேரத்தில் நிர்வாகியால் சரிபார்க்கப்படும்" },
  "sub.subscribe": { en: "Subscribe", ta: "சந்தா" },
  "sub.noActivePlan": { en: "No active plan. Subscribe to unlock features!", ta: "செயலில் திட்டம் இல்லை. அம்சங்களைத் திறக்க சந்தா செய்யுங்கள்!" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("app-lang");
    return (saved === "ta" ? "ta" : "en") as Lang;
  });

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("app-lang", newLang);
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] || translations[key]?.en || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
