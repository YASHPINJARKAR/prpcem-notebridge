const token = localStorage.getItem("token");

async function loadProfile() {
  try {
    const res = await fetch("http://localhost:5000/api/auth/me", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data.success) {
      alert("Failed to load profile");
      return;
    }

    const user = data.user;

    document.getElementById("name").innerText =
      user.firstName + " " + user.lastName;

    document.getElementById("email").innerText = user.email;
    document.getElementById("role").innerText = user.role;
    document.getElementById("branch").innerText = user.branch || "N/A";
    document.getElementById("year").innerText = user.year || "N/A";

  } catch (err) {
    console.log(err);
  }
}

loadProfile();