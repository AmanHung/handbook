import { BookOpen, Calendar, Search, Shield, User } from 'lucide-react';
export const getSiteNavigation = role => [
  { id: 'lookup', label: 'SOP 速查', icon: Search },
  { id: 'video', label: '影音教學', icon: BookOpen },
  { id: 'shift', label: '排班表', icon: Calendar },
  ...(['student', 'intern', 'teacher', 'admin'].includes(role) ? [{ id: 'passport', label: '學習護照', icon: User }] : []),
  ...(['teacher', 'admin'].includes(role) ? [{ id: 'admin', label: '後台管理', icon: Shield }] : []),
];
