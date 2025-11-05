// ===============================
// PROFILE FORM POPULATION & SAVE
// ===============================
async function initProfile() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "handsign.html";
    return;
  }

  // -------------------------------
  // Elements (query inside function)
  // -------------------------------
  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const repeatPasswordInput = document.getElementById("repeatPassword");
  const profileImage = document.getElementById("profileImage");
  const uploadProfilePic = document.getElementById("uploadProfilePic");
  const saveBtn = document.getElementById("saveProfileBtn");

  usernameInput.value = user.name || "";
  emailInput.value = user.email || "";
  profileImage.src = user.profilePic || "../media/default-user.jpg";

  // -------------------------------
  // Profile picture preview
  // -------------------------------
  uploadProfilePic.addEventListener("change", () => {
    const file = uploadProfilePic.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        profileImage.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // -------------------------------
  // Save profile changes
  // -------------------------------
  saveBtn.addEventListener("click", async () => {
    const name = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const repeatPassword = repeatPasswordInput.value;

    if (password && password !== repeatPassword) {
      alert("Passwords do not match!");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    if (password) formData.append("password", password);

    if (uploadProfilePic.files[0]) {
      formData.append("profilePic", uploadProfilePic.files[0]);
    }

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/update-profile/${user.id}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        alert("Profile updated successfully!");

        const updatedUser = {
          ...user,
          name,
          email,
          profilePic: data.profilePic || user.profilePic,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } else {
        alert(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Try again later.");
    }
  });
}
