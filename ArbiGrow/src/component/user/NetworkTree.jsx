// {/* <motion.div
//   initial={{ opacity: 0, y: 20 }}
//   animate={{ opacity: 1, y: 0 }}
//   transition={{ delay: 0.38 }}
//   className="rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden"
// >
//   {/* Header */}
//   <div className="p-4 md:p-5 border-b border-white/10 flex items-center gap-3">
//     <GitBranch className="w-5 h-5 text-cyan-400 flex-shrink-0" />
//     <div>
//       <h2 className="font-bold text-white">Network Tree</h2>
//       <p className="text-xs text-gray-400">
//         {totalReferrals} members across 5 levels
//       </p>
//     </div>
//   </div>

//   {/* Level selector tabs — horizontally scrollable on mobile */}
//   <div className="px-4 md:px-5 pt-4 pb-1">
//     <div
//       className="flex gap-2 overflow-x-auto pb-1"
//       style={{ scrollbarWidth: "none" }}
//     >
//       {fixedReferralData.map((lvl) => {
//         const lc2 = levelColors[lvl.level];
//         const isActive = selectedReferralLevel === lvl.level;
//         return (
//           <button
//             key={lvl.level}
//             onClick={() => setSelectedReferralLevel(lvl.level)}
//             className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border transition-all duration-250 min-w-[72px] ${
//               isActive
//                 ? `bg-gradient-to-br ${lc2.bg} ${lc2.border}`
//                 : "bg-white/[0.04] border-white/10 hover:border-white/20"
//             }`}
//           >
//             <span
//               className={`text-[10px] font-semibold ${isActive ? lc2.text : "text-gray-500"}`}
//             >
//               Level {lvl.level}
//             </span>
//             <span
//               className={`text-lg font-bold leading-none ${isActive ? "text-white" : "text-gray-500"}`}
//             >
//               {lvl.users.length}
//             </span>
//             <span
//               className={`text-[9px] font-medium ${isActive ? lc2.text : "text-gray-600"}`}
//             >
//               {lvl.commissionRate}
//             </span>
//           </button>
//         );
//       })}
//     </div>
//   </div>

//   {/* Active level summary strip */}
//   <div
//     className={`mx-4 md:mx-5 mt-3 px-3 py-2.5 rounded-xl bg-gradient-to-r ${lc.bg} border ${lc.border} flex flex-wrap items-center justify-between gap-2`}
//   >
//     <div className="flex items-center gap-2">
//       <span
//         className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${lc.border} ${lc.text} bg-black/20`}
//       >
//         L{selectedReferralLevel}
//       </span>
//       <span className="text-white text-sm font-semibold">
//         {activeLevel.users.length} member
//         {activeLevel.users.length !== 1 ? "s" : ""}
//       </span>
//     </div>
//     <div className="flex items-center gap-3 text-xs">
//       <div className="flex items-center gap-1">
//         <Award className={`w-3.5 h-3.5 ${lc.text}`} />
//         <span className={`${lc.text} font-semibold`}>
//           {activeLevel.commissionRate} commission
//         </span>
//       </div>
//       <span className="text-green-400 font-semibold">
//         ${activeLevel.totalEarnings.toFixed(2)} earned
//       </span>
//     </div>
//   </div>

//   {/* User cards grid */}
//   <div className="p-4 md:p-5">
//     <AnimatePresence mode="wait">
//       <motion.div
//         key={selectedReferralLevel}
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         exit={{ opacity: 0, y: -8 }}
//         transition={{ duration: 0.22 }}
//         className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
//       >
//         {activeLevel.users.map((user, idx) => (
//           <motion.div
//             key={user.id}
//             initial={{ opacity: 0, scale: 0.96 }}
//             animate={{ opacity: 1, scale: 1 }}
//             transition={{ delay: idx * 0.04 }}
//             className={`p-4 rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/10 hover:${lc.border} transition-all duration-300`}
//           >
//             {/* Top row: avatar + name + status */}
//             <div className="flex items-center justify-between mb-3 gap-2">
//               <div className="flex items-center gap-2.5 min-w-0">
//                 <div
//                   className={`w-9 h-9 rounded-full bg-gradient-to-br ${lc.bg} border ${lc.border} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
//                 >
//                   {user.name.charAt(0)}
//                 </div>
//                 <div className="min-w-0">
//                   <div className="text-white font-semibold text-sm truncate">
//                     {user.name}
//                   </div>
//                   <div className="text-gray-400 text-[11px] truncate">
//                     @{user.username}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Stats row */}
//             <div className="grid grid-cols-3 gap-1.5 mb-3">
//               {[
//                 {
//                   label: "Joined",
//                   value: user.joinDate,
//                   cls: "text-white",
//                 },
//                 {
//                   label: "Earnings",
//                   value: `$${user.totalEarnings.toFixed(2)}`,
//                   cls: "text-green-400",
//                 },
//                 {
//                   label: "Sub-refs",
//                   value: String(user.directReferrals),
//                   cls: lc.text,
//                 },
//               ].map((s) => (
//                 <div
//                   key={s.label}
//                   className="bg-white/[0.04] rounded-lg px-2 py-1.5 text-center"
//                 >
//                   <div className="text-[9px] text-gray-500 mb-0.5 uppercase tracking-wide">
//                     {s.label}
//                   </div>
//                   <div
//                     className={`text-[11px] font-bold ${s.cls} leading-tight`}
//                   >
//                     {s.value}
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* Referred-by footer */}
//             <div
//               className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r ${lc.bg} border ${lc.border}`}
//             >
//               <Users className={`w-3 h-3 ${lc.text} flex-shrink-0`} />
//               <span className="text-gray-500 text-[10px]">via</span>
//               <span className={`${lc.text} text-[10px] font-semibold truncate`}>
//                 @{user.referredBy}
//               </span>
//             </div>
//           </motion.div>
//         ))}
//       </motion.div>
//     </AnimatePresence>
//   </div>

//   {/* Prev / dot-indicators / Next footer */}
//   <div className="px-4 md:px-5 pb-4 border-t border-white/10 pt-3 flex items-center justify-between">
//     <button
//       onClick={() => setSelectedReferralLevel((prev) => Math.max(1, prev - 1))}
//       disabled={selectedReferralLevel === 1}
//       className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
//     >
//       <ChevronLeft className="w-3.5 h-3.5" /> Prev
//     </button>

//     <div className="flex items-center gap-1.5">
//       {fixedReferralData.map((lvl) => {
//         const lc2 = levelColors[lvl.level];
//         const isActive = selectedReferralLevel === lvl.level;
//         return (
//           <button
//             key={lvl.level}
//             onClick={() => setSelectedReferralLevel(lvl.level)}
//             className={`rounded-full transition-all duration-300 ${
//               isActive
//                 ? `h-2 w-5 ${lc2.dot}`
//                 : "h-2 w-2 bg-white/20 hover:bg-white/40"
//             }`}
//           />
//         );
//       })}
//     </div>

//     <button
//       onClick={() => setSelectedReferralLevel((prev) => Math.min(5, prev + 1))}
//       disabled={selectedReferralLevel === 5}
//       className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
//     >
//       Next <ChevronRight className="w-3.5 h-3.5" />
//     </button>
//   </div>
// </motion.div>; */}
