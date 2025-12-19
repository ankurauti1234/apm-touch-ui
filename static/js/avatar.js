/* ==============================================================
   avatar.js
   Avatar image selection based on gender and age
   ============================================================== */

function avatar(gender, dob) {
    if (!gender || !dob) return '/static/assets/default.png';

    // Compute age from DOB
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    const cat = age <= 12 ? 'kid' :
        age <= 19 ? 'teen' :
            age <= 40 ? 'middle' :
                age <= 60 ? 'aged' : 'elder';

    return `/static/assets/${gender.toLowerCase()}-${cat}.png`;
}