import React, { useState } from 'react';
import { avatarForPerson } from '../../shared/avatar-assets.js';
export default function ProfileImage({
  person
}) {
  const source = avatarForPerson(person);
  const [failedSource, setFailedSource] = useState(null);
  return source && source !== failedSource ? <img className="profile-portrait" src={source} alt="" aria-hidden="true" loading="lazy" width="96" height="96" onError={() => setFailedSource(source)} /> : null;
}
