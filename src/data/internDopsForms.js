import { DOPS_FORMS } from './dopsForms.js';

// 藥劑科實習生訓練計畫 11409：化療調劑安全訓練 2.1、附件 5。
export const INTERN_DOPS_FORMS = DOPS_FORMS.filter(form => form.id === 'dops_chemo_ppe');
export const isInternDopsForm = id => INTERN_DOPS_FORMS.some(form => form.id === id);
