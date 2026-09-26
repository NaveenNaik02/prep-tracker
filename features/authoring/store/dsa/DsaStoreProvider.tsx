'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { DsaContext, createDsaStore } from './dsaStore';
import type { DsaInit } from './types';

type Props = Omit<DsaInit, 'groups' | 'defaultPriority'> & {
  children: ReactNode;
};

export const DsaStoreProvider = ({ children, ...init }: Props) => {
  const groups = useAppStore((s) => s.groups);
  const defaultPriority = useAppStore((s) => s.defaultPriority);

  // useState's lazy initializer: constructed exactly once per modal, already
  // seeded, so the first render is correct.
  const [store] = useState(() => {
    return createDsaStore({ ...init, groups, defaultPriority });
  });

  // `groups` is a fresh server value after any router.refresh().
  useEffect(() => {
    store.getState().setGroups(groups);
  }, [store, groups]);

  return <DsaContext value={store}>{children}</DsaContext>;
};
