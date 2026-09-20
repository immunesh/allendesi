'use client';

import { useEffect, useState } from 'react';

type SellerProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
};

export default function SellerProfilePage() {
  const [profile, setProfile] = useState<SellerProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'SELLER',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load profile from localStorage
  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem('user') ||
        localStorage.getItem('authUser');

      if (storedUser) {
        const user = JSON.parse(storedUser);

        setProfile({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          role: user.role || 'SELLER',
        });
      }
    } catch (error) {
      console.error('Failed to load profile', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = () => {
    try {
      setSaving(true);

      // Save updated profile
      localStorage.setItem('user', JSON.stringify(profile));
      localStorage.setItem('authUser', JSON.stringify(profile));

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save profile', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-6 text-white">
        Loading profile...
      </div>
    );
  }

  const initials =
    `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}` || 'S';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-red-950/40 bg-[#0c0c0c] p-5">
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="mt-1 text-sm text-gray-400">
          Update your store identity and seller details.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Profile Card */}
        <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-xl font-semibold text-white">
              {initials}
            </div>

            <div>
              <p className="font-semibold text-white">
                {profile.firstName} {profile.lastName}
              </p>

              <p className="text-sm text-gray-400">{profile.email}</p>

              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-red-400">
                {profile.role}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="rounded-3xl border border-red-950/40 bg-[#0b0b0b] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                First Name
              </label>

              <input
                name="firstName"
                value={profile.firstName}
                onChange={handleChange}
                className="input-field"
                placeholder="First name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Last Name
              </label>

              <input
                name="lastName"
                value={profile.lastName}
                onChange={handleChange}
                className="input-field"
                placeholder="Last name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Email
              </label>

             <input
  name="email"
  type="email"
  value={profile.email}
  onChange={handleChange}
  className="input-field"
  placeholder="Email address"
/>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Phone
              </label>

              <input
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="Phone number"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary mt-4 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}