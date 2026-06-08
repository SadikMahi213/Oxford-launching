import { motion } from "motion/react";
import { UserCircle, Check, Lock, Award } from "lucide-react";
import useUserStore from "../../store/userStore";
import { useNavigate } from "react-router";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  // console.log(user)
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Profile
          </span>
        </h1>
        <p className="text-sm text-gray-400">Manage your account information</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-blue-600/20 border-b border-white/10 px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <UserCircle className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-bold text-white">
                    {user.full_name}
                  </h2>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-xs text-green-400">
                    <Check className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <p className="text-sm text-gray-400">@{user.username}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="p-4 md:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            Personal Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Full Name</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white">{user.full_name}</p>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Username</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white">@{user.username}</p>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Email</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white">{user.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Phone</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white">{user.phone_number}</p>
              </div>
            </div>

            {/* Country - Full Width */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-gray-400">Country</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white">{user.country}</p>
              </div>
            </div>
          </div>

          {/* Change Password Button */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => navigate("/reset-password")}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </button>
          </div>
        </div>
      </motion.div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-xl bg-gradient-to-br from-green-600/10 to-green-600/5 backdrop-blur-xl border border-green-500/30 p-4 md:p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Account Status</h3>
              <p className="text-xs text-gray-400">Active & Verified</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            Your account is fully verified and active. You can access all
            platform features.
          </p>
        </motion.div>

        {/* Member Since */}
        {/* <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.5, delay: 0.2 }}
                 className="rounded-xl bg-gradient-to-br from-blue-600/10 to-cyan-600/5 backdrop-blur-xl border border-blue-500/30 p-4 md:p-5"
               >
                 <div className="flex items-center gap-3 mb-3">
                   <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                     <Award className="w-5 h-5 text-blue-400" />
                   </div>
                   <div>
                     <h3 className="font-semibold text-white">Member Since</h3>
                     <p className="text-xs text-gray-400">Join Date</p>
                   </div>
                 </div>
                 <p className="text-sm text-gray-400">You joined ArbiGrow on <span className="text-white font-semibold">December 1, 2024</span></p>
               </motion.div> */}
      </div>
    </div>
  );
};

export default ProfilePage;
