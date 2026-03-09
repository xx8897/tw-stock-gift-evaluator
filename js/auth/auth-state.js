/**
 * auth-state.js — 共享變數 (Global Scope)
 */
var currentAuthTab = 'signin';
var pendingEmail = '';
var recoverEmail = '';
var otpCooldownTimer = null;
var recoverOtpCooldownTimer = null;
var isSubmitting = false;

console.log('[Auth State]: 初始化完成');
