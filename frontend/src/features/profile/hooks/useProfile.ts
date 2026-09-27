import { useMutation } from '@tanstack/react-query';
import { updateProfile, changePassword } from '../api/profileApi.js';

export function useUpdateProfile() {
  return useMutation({
    mutationFn: updateProfile,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
  });
}
