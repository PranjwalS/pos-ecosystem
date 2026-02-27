export async function redirectToUserSlug(navigate) {
  const token = localStorage.getItem("token");
  const res = await fetch("http://localhost:8000/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch user");
  navigate(`/${data.slug}`, { replace: true });
}