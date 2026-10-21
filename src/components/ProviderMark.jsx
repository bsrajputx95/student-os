import React from 'react';
import CompanyLogo from './CompanyLogo.jsx';
const names = {
  'Microsoft Learn': 'Microsoft',
  'Google for Developers': 'Google',
  'IBM SkillsBuild': 'IBM',
  'Cisco Networking Academy': 'Cisco',
  'AWS Training': 'Amazon'
};
export default function ProviderMark({
  provider
}) {
  return <CompanyLogo name={names[provider] || provider} className="learning-provider-logo" />;
}
