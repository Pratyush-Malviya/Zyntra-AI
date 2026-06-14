import { ReactNode, useState, useEffect } from 'react';
import {
  Box,
  Flex,
  HStack,
  VStack,
  IconButton,
  Text,
  Select,
  Avatar,
  useColorMode,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerContent,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Input,
  Kbd,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
} from '@chakra-ui/react';
import {
  Menu, X, Zap, Activity, Building, Users, Cpu, ShieldCheck,
  CreditCard, LayoutDashboard, Settings, Globe, Check, MessageSquare,
  TrendingUp, Target, Kanban, Sparkles, FileText, List, Sun, Moon,
  LogOut, Mic, Link2, Mail, BarChart2, DollarSign, Workflow, Search, ChevronRight,
} from 'lucide-react';

export type AppView =
  | 'OUTREACH' | 'RESEARCH' | 'SDR_DAILY' | 'SDR_STATS'
  | 'MGR_DASHBOARD' | 'MGR_APPROVALS' | 'MGR_CALLS' | 'MGR_FORECAST'
  | 'AE_PIPELINE' | 'AE_HEALTH' | 'AE_COPILOT' | 'AE_BRIEFS'
  | 'VIEWER_DASHBOARD' | 'VIEWER_PIPELINE'
  | 'SUPER_ADMIN' | 'SUPER_ADMIN_BILLING'
  | 'ORG_DASHBOARD' | 'ORG_MEMBERS' | 'ORG_BRANDING' | 'ORG_DOMAIN' | 'ORG_BILLING' | 'ORG_FEATURES' | 'ORG_SECURITY'
  | 'SETTINGS' | 'TEAM_ADMIN' | 'JOURNEY' | 'ANALYTICS'
  | 'MEETINGS' | 'AFFILIATES' | 'EMAIL_SEQUENCES'
  | 'PIPELINE_ANALYTICS' | 'AI_COSTS' | 'INTEGRATIONS';

export type SuperAdminTab = 'dashboard' | 'employees_list' | 'add_employees' | 'organizations' | 'enterprise_suite' | 'llm_config';
export type UserRole = 'super_admin' | 'org_admin' | 'sdr' | 'manager' | 'ae' | 'viewer';

interface NavItem {
  view: AppView;
  subTab?: string;
  icon: React.ReactNode;
  label: string;
}

interface AppShellProps {
  children: ReactNode;
  activeView: AppView;
  onViewChange: (view: AppView, subTab?: string) => void;
  superAdminTab: SuperAdminTab;
  onSuperAdminTabChange: (tab: SuperAdminTab) => void;
  simulatedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  user: any;
  profile: any;
  onLogout: () => void;
}

function SidebarNavItem({
  icon,
  label,
  isActive,
  collapsed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const content = (
    <Flex
      onClick={onClick}
      cursor="pointer"
      align="center"
      gap={3}
      px={3}
      py={2.5}
      mx={2}
      rounded="lg"
      transition="all 0.15s"
      role="group"
      position="relative"
      sx={
        isActive
          ? {
              bg: 'rgba(99, 102, 241, 0.12)',
              color: 'rgba(165, 180, 252, 1)',
              _before: {
                content: '""',
                position: 'absolute',
                left: '-8px',
                top: '6px',
                bottom: '6px',
                w: '3px',
                borderRadius: 'full',
                bg: '#818cf8',
              },
            }
          : {
              color: 'rgba(255,255,255,0.45)',
              _hover: {
                bg: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.9)',
              },
            }
      }
    >
      <Box boxSize={5} flexShrink={0}>
        {icon}
      </Box>
      <Box
        fontSize="sm"
        fontWeight="medium"
        whiteSpace="nowrap"
        opacity={collapsed ? 0 : 1}
        transition="opacity 0.15s"
      >
        {label}
      </Box>
    </Flex>
  );

  if (collapsed) {
    return (
      <Tooltip label={label} placement="right" hasArrow gutter={12}>
        {content}
      </Tooltip>
    );
  }

  return content;
}

function SectionHeader({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <Text
      fontSize="2xs"
      fontWeight="semibold"
      textTransform="uppercase"
      letterSpacing="0.12em"
      color="rgba(255,255,255,0.25)"
      px={5}
      pt={5}
      pb={1.5}
    >
      {label}
    </Text>
  );
}

export function AppShell({
  children, activeView, onViewChange, superAdminTab, onSuperAdminTabChange,
  simulatedRole, onRoleChange, user, profile, onLogout,
}: AppShellProps) {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen: isMobileOpen, onOpen: onMobileOpen, onClose: onMobileClose } = useDisclosure();
  const { isOpen: isSearchOpen, onOpen: onSearchOpen, onClose: onSearchClose } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('zyntra-menu-collapsed') === 'true');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearchOpen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchOpen]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('zyntra-menu-collapsed', String(next));
  };

  const handleNav = (view: AppView, subTab?: string) => {
    onViewChange(view, subTab);
    onMobileClose();
  };

  const handleSuperAdminNav = (tab: SuperAdminTab) => {
    onSuperAdminTabChange(tab);
    onViewChange('SUPER_ADMIN', tab);
    onMobileClose();
  };

  const navWidth = collapsed ? '68px' : '260px';

  const superAdminItems: NavItem[] = [
    { view: 'SUPER_ADMIN', subTab: 'dashboard', icon: <Activity size={18} />, label: 'Dashboard' },
    { view: 'SUPER_ADMIN', subTab: 'organizations', icon: <Building size={18} />, label: 'Organizations' },
    { view: 'SUPER_ADMIN', subTab: 'employees_list', icon: <Users size={18} />, label: 'Employees' },
    { view: 'SUPER_ADMIN', subTab: 'llm_config', icon: <Cpu size={18} />, label: 'LLM Routing' },
    { view: 'SUPER_ADMIN', subTab: 'enterprise_suite', icon: <ShieldCheck size={18} />, label: 'Enterprise Audit' },
    { view: 'SUPER_ADMIN_BILLING', icon: <CreditCard size={18} />, label: 'Billing' },
  ];

  const orgAdminItems: NavItem[] = [
    { view: 'ORG_DASHBOARD', icon: <LayoutDashboard size={18} />, label: 'Overview' },
    { view: 'ORG_MEMBERS', icon: <Users size={18} />, label: 'Members' },
    { view: 'ORG_BRANDING', icon: <Settings size={18} />, label: 'Branding' },
    { view: 'ORG_DOMAIN', icon: <Globe size={18} />, label: 'Domain' },
    { view: 'ORG_BILLING', icon: <CreditCard size={18} />, label: 'Billing' },
    { view: 'ORG_FEATURES', icon: <Zap size={18} />, label: 'Features' },
    { view: 'ORG_SECURITY', icon: <ShieldCheck size={18} />, label: 'Security' },
  ];

  const sdrItems: NavItem[] = [
    { view: 'OUTREACH', icon: <Target size={18} />, label: 'Campaigns' },
    { view: 'RESEARCH', icon: <Globe size={18} />, label: 'Prospect Intel' },
    { view: 'SDR_DAILY', icon: <List size={18} />, label: 'Daily Queue' },
    { view: 'MEETINGS' as AppView, icon: <Mic size={18} />, label: 'Meetings' },
    { view: 'EMAIL_SEQUENCES' as AppView, icon: <Mail size={18} />, label: 'Email Sequences' },
    { view: 'AFFILIATES' as AppView, icon: <Link2 size={18} />, label: 'Affiliates' },
    { view: 'SDR_STATS', icon: <TrendingUp size={18} />, label: 'Analytics' },
  ];

  const managerItems: NavItem[] = [
    { view: 'MGR_DASHBOARD', icon: <LayoutDashboard size={18} />, label: 'Team Feed' },
    { view: 'MGR_APPROVALS', icon: <Check size={18} />, label: 'Approvals' },
    { view: 'MGR_CALLS', icon: <MessageSquare size={18} />, label: 'Call Coaching' },
    { view: 'MGR_FORECAST', icon: <TrendingUp size={18} />, label: 'Forecast' },
  ];

  const aeItems: NavItem[] = [
    { view: 'AE_PIPELINE', icon: <Kanban size={18} />, label: 'Pipeline' },
    { view: 'AE_HEALTH', icon: <ShieldCheck size={18} />, label: 'Deal Health' },
    { view: 'AE_COPILOT', icon: <Sparkles size={18} />, label: 'AI Copilot' },
    { view: 'AE_BRIEFS', icon: <FileText size={18} />, label: 'Briefings' },
    { view: 'MEETINGS' as AppView, icon: <Mic size={18} />, label: 'Meetings' },
    { view: 'PIPELINE_ANALYTICS' as AppView, icon: <BarChart2 size={18} />, label: 'Pipeline Analytics' },
    { view: 'AI_COSTS' as AppView, icon: <DollarSign size={18} />, label: 'AI Costs' },
  ];

  const viewerItems: NavItem[] = [
    { view: 'VIEWER_DASHBOARD', icon: <LayoutDashboard size={18} />, label: 'Metrics' },
    { view: 'VIEWER_PIPELINE', icon: <Kanban size={18} />, label: 'Pipeline' },
  ];

  const isSuperAdminActive = (tab: string) =>
    activeView === 'SUPER_ADMIN' && superAdminTab === tab as SuperAdminTab;

  const sidebarContent = (inDrawer: boolean) => (
    <VStack h="full" spacing={0} align="stretch">
      <Flex
        h="56px"
        px={collapsed && !inDrawer ? 3 : 4}
        align="center"
        justify={collapsed && !inDrawer ? 'center' : 'space-between'}
        flexShrink={0}
      >
        <Flex align="center" gap={3}>
          <Flex
            w={8}
            h={8}
            rounded="lg"
            bgGradient="linear(to-br, #6366f1, #818cf8)"
            align="center"
            justify="center"
          >
            <Zap size={16} color="white" fill="white" />
          </Flex>
          {(!collapsed || inDrawer) && (
            <Box>
              <Text fontWeight="extrabold" fontSize="md" lineHeight="tight" color="white">
                Zyntra AI
              </Text>
            </Box>
          )}
        </Flex>
        {!inDrawer && (
          <IconButton
            aria-label="Toggle sidebar"
            icon={<Menu size={14} />}
            variant="ghost"
            size="xs"
            color="rgba(255,255,255,0.3)"
            _hover={{ color: 'rgba(255,255,255,0.7)' }}
            onClick={toggleCollapsed}
          />
        )}
        {inDrawer && (
          <IconButton
            aria-label="Close menu"
            icon={<X size={18} />}
            variant="ghost"
            size="sm"
            color="rgba(255,255,255,0.5)"
            onClick={onMobileClose}
          />
        )}
      </Flex>

      <Box flex={1} overflowY="auto" py={2}>
        {simulatedRole === 'super_admin' && (
          <>
            <SectionHeader label="Super Admin" collapsed={collapsed && !inDrawer} />
            {superAdminItems.map((item) => (
              <SidebarNavItem
                key={item.view + (item.subTab || '')}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed && !inDrawer}
                isActive={
                  item.subTab
                    ? isSuperAdminActive(item.subTab)
                    : activeView === item.view
                }
                onClick={() =>
                  item.subTab
                    ? handleSuperAdminNav(item.subTab as SuperAdminTab)
                    : handleNav(item.view)
                }
              />
            ))}
          </>
        )}

        {simulatedRole === 'org_admin' && (
          <>
            <SectionHeader label="Org Admin" collapsed={collapsed && !inDrawer} />
            {orgAdminItems.map((item) => (
              <SidebarNavItem
                key={item.view}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed && !inDrawer}
                isActive={activeView === item.view}
                onClick={() => handleNav(item.view)}
              />
            ))}
          </>
        )}

        {simulatedRole === 'sdr' && (
          <>
            <SectionHeader label="SDR Workspace" collapsed={collapsed && !inDrawer} />
            {sdrItems.map((item) => (
              <SidebarNavItem
                key={item.view}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed && !inDrawer}
                isActive={activeView === item.view}
                onClick={() => handleNav(item.view)}
              />
            ))}
          </>
        )}

        {simulatedRole === 'manager' && (
          <>
            <SectionHeader label="Manager" collapsed={collapsed && !inDrawer} />
            {managerItems.map((item) => (
              <SidebarNavItem
                key={item.view}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed && !inDrawer}
                isActive={activeView === item.view}
                onClick={() => handleNav(item.view)}
              />
            ))}
          </>
        )}

        {simulatedRole === 'ae' && (
          <>
            <SectionHeader label="AE Workspace" collapsed={collapsed && !inDrawer} />
            {aeItems.map((item) => (
              <SidebarNavItem
                key={item.view}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed && !inDrawer}
                isActive={activeView === item.view}
                onClick={() => handleNav(item.view)}
              />
            ))}
          </>
        )}

        {simulatedRole === 'viewer' && (
          <>
            <SectionHeader label="Viewer" collapsed={collapsed && !inDrawer} />
            {viewerItems.map((item) => (
              <SidebarNavItem
                key={item.view}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed && !inDrawer}
                isActive={activeView === item.view}
                onClick={() => handleNav(item.view)}
              />
            ))}
          </>
        )}

        <Box mt={4} mx={2} borderTopWidth={1} borderColor="rgba(255,255,255,0.06)" pt={3}>
          <SidebarNavItem
            icon={<Settings size={18} />}
            label="Settings"
            collapsed={collapsed && !inDrawer}
            isActive={activeView === 'SETTINGS'}
            onClick={() => handleNav('SETTINGS')}
          />
          <SidebarNavItem
            icon={colorMode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            label={colorMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            collapsed={collapsed && !inDrawer}
            onClick={toggleColorMode}
          />
        </Box>
      </Box>

      <Box p={3} borderTopWidth={1} borderColor="rgba(255,255,255,0.06)" flexShrink={0}>
        <Flex
          align="center"
          gap={2.5}
          px={2.5}
          py={2}
          rounded="lg"
          role="group"
          cursor="pointer"
          _hover={{ bg: 'rgba(255,255,255,0.04)' }}
        >
          <Avatar size="xs" src={user?.photoURL} name={user?.displayName} />
          {(!collapsed || inDrawer) && (
            <>
              <Box flex={1} minW={0}>
                <Text fontSize="xs" fontWeight="semibold" color="white" noOfLines={1}>
                  {user?.displayName || 'User'}
                </Text>
                <Text fontSize="2xs" color="rgba(255,255,255,0.35)" noOfLines={1}>
                  {profile?.role?.replace('_', ' ')}
                </Text>
              </Box>
              <IconButton
                aria-label="Logout"
                icon={<LogOut size={14} />}
                variant="ghost"
                size="xs"
                color="rgba(255,255,255,0.3)"
                _hover={{ color: '#ef4444' }}
                onClick={onLogout}
              />
            </>
          )}
        </Flex>
      </Box>
    </VStack>
  );

  return (
    <Flex h="100vh" overflow="hidden">
      <Box
        display={{ base: 'none', md: 'block' }}
        w={navWidth}
        h="100vh"
        bg="#0d0d19"
        borderRightWidth={1}
        borderColor="rgba(255,255,255,0.06)"
        transition="width 0.2s"
        overflow="hidden"
        flexShrink={0}
      >
        {sidebarContent(false)}
      </Box>

      <Drawer placement="left" onClose={onMobileClose} isOpen={isMobileOpen}>
        <DrawerOverlay bg="rgba(0,0,0,0.6)" />
        <DrawerContent bg="#0d0d19" maxW="280px">
          <DrawerBody p={0}>
            {sidebarContent(true)}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Flex direction="column" flex={1} minW={0}>
        <Flex
          as="header"
          h="56px"
          borderBottomWidth={1}
          borderColor="rgba(255,255,255,0.06)"
          align="center"
          justify="space-between"
          px={{ base: 4, md: 6 }}
          bg="rgba(7,7,13,0.8)"
          backdropFilter="blur(16px)"
          position="sticky"
          top={0}
          zIndex={40}
          flexShrink={0}
        >
          <HStack spacing={3} minW={0}>
            <IconButton
              aria-label="Open menu"
              icon={<Menu size={18} />}
              variant="ghost"
              size="sm"
              display={{ md: 'none' }}
              color="rgba(255,255,255,0.5)"
              onClick={onMobileOpen}
            />
            <Box display={{ base: 'flex', md: 'none' }} alignItems="center" gap={2}>
              <Flex
                w={7} h={7}
                rounded="lg"
                bgGradient="linear(to-br, #6366f1, #818cf8)"
                align="center"
                justify="center"
              >
                <Zap size={14} color="white" fill="white" />
              </Flex>
            </Box>
            <Text
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
              letterSpacing="0.1em"
              color="rgba(255,255,255,0.4)"
              noOfLines={1}
            >
              {activeView === 'OUTREACH' ? 'Outreach Campaigns'
                : activeView === 'RESEARCH' ? 'Prospect Intel'
                : activeView === 'ANALYTICS' ? 'Pipeline Health'
                : activeView === 'TEAM_ADMIN' ? 'Team Admin'
                : activeView === 'SETTINGS' ? 'Settings'
                : activeView === 'JOURNEY' ? 'Pipeline Journey'
                : activeView === 'AE_PIPELINE' ? 'Deal Pipeline'
                : activeView === 'AE_HEALTH' ? 'Deal Health'
                : activeView === 'AE_COPILOT' ? 'AI Copilot'
                : activeView === 'AE_BRIEFS' ? 'Pre-Call Briefings'
                : activeView === 'SDR_DAILY' ? 'Daily Queue'
                : activeView === 'SDR_STATS' ? 'Analytics'
                : activeView === 'MGR_DASHBOARD' ? 'Team Dashboard'
                : activeView === 'MGR_APPROVALS' ? 'Approvals'
                : activeView === 'MGR_CALLS' ? 'Call Coaching'
                : activeView === 'MGR_FORECAST' ? 'Forecast'
                : activeView === 'VIEWER_DASHBOARD' ? 'Dashboard'
                : activeView === 'VIEWER_PIPELINE' ? 'Pipeline'
                : activeView === 'SUPER_ADMIN' ? 'Super Admin'
                : activeView === 'SUPER_ADMIN_BILLING' ? 'Billing'
                : activeView === 'ORG_DASHBOARD' ? 'Org Overview'
                : activeView === 'ORG_MEMBERS' ? 'Members'
                : activeView === 'ORG_BRANDING' ? 'Branding'
                : activeView === 'ORG_DOMAIN' ? 'Domain'
                : activeView === 'ORG_BILLING' ? 'Billing'
                : activeView === 'ORG_FEATURES' ? 'Features'
                : activeView === 'ORG_SECURITY' ? 'Security'
                : (activeView as string) === 'MEETINGS' ? 'Meeting Intelligence'
                : (activeView as string) === 'AFFILIATES' ? 'Affiliate Partners'
                : (activeView as string) === 'EMAIL_SEQUENCES' ? 'Email Sequences'
                : (activeView as string) === 'PIPELINE_ANALYTICS' ? 'Pipeline Analytics'
                : (activeView as string) === 'AI_COSTS' ? 'AI Cost Tracker'
                : (activeView as string) === 'INTEGRATIONS' ? 'Integrations'
                : 'Admin'}
            </Text>
          </HStack>

          <HStack spacing={2}>
            {/* Search Palette Trigger */}
            <Button
              size="xs"
              variant="outline"
              bg="rgba(255,255,255,0.02)"
              borderColor="rgba(255,255,255,0.08)"
              _hover={{ bg: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)" }}
              onClick={onSearchOpen}
              leftIcon={<Search size={12} />}
              color="rgba(255,255,255,0.4)"
              fontSize="2xs"
              fontWeight="normal"
              borderRadius="md"
              px={2}
              py={1}
              h="26px"
              display={{ base: 'none', sm: 'flex' }}
            >
              Search... <Kbd ml={2} bg="rgba(0,0,0,0.3)" border="none" color="rgba(255,255,255,0.6)" fontSize="3xs">⌘K</Kbd>
            </Button>

            {/* AI Agent Status Indicator */}
            <Popover trigger="hover" placement="bottom-end">
              <PopoverTrigger>
                <Flex
                  align="center"
                  gap={1.5}
                  px={2}
                  py={1}
                  h="26px"
                  rounded="md"
                  bg="rgba(99, 102, 241, 0.08)"
                  borderWidth={1}
                  borderColor="rgba(99, 102, 241, 0.2)"
                  cursor="pointer"
                  _hover={{ bg: "rgba(99, 102, 241, 0.15)" }}
                >
                  <Box w={1.5} h={1.5} rounded="full" bg="#818cf8" className="animate-pulse" />
                  <Text fontSize="3xs" fontWeight="bold" color="#a5b4fc" textTransform="uppercase" letterSpacing="0.08em">
                    AI: Idle
                  </Text>
                </Flex>
              </PopoverTrigger>
              <PopoverContent bg="#12131a" borderColor="rgba(255,255,255,0.08)" color="white" w="220px">
                <PopoverArrow bg="#12131a" />
                <PopoverHeader borderBottomWidth={1} borderColor="rgba(255,255,255,0.06)" py={1.5} px={3}>
                  <Text fontSize="2xs" fontWeight="bold">Active AI Copilots</Text>
                </PopoverHeader>
                <PopoverBody p={2}>
                  <VStack align="stretch" spacing={1.5}>
                    <Flex justify="space-between" align="center" py={0.5}>
                      <HStack spacing={1.5}>
                        <Search size={10} className="text-indigo-400" />
                        <Text fontSize="3xs">Research Agent</Text>
                      </HStack>
                      <Text fontSize="3xs" color="gray.500">Idle</Text>
                    </Flex>
                    <Flex justify="space-between" align="center" py={0.5}>
                      <HStack spacing={1.5}>
                        <Mic size={10} className="text-purple-400" />
                        <Text fontSize="3xs">Post-Meeting Agent</Text>
                      </HStack>
                      <Text fontSize="3xs" color="gray.500">Idle</Text>
                    </Flex>
                    <Flex justify="space-between" align="center" py={0.5}>
                      <HStack spacing={1.5}>
                        <Mail size={10} className="text-emerald-400" />
                        <Text fontSize="3xs">Outreach Writer</Text>
                      </HStack>
                      <Text fontSize="3xs" color="gray.500">Idle</Text>
                    </Flex>
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>

            <Flex
              align="center"
              gap={1.5}
              p={0.5}
              h="26px"
              bg="rgba(255,255,255,0.04)"
              borderWidth={1}
              borderColor="rgba(255,255,255,0.06)"
              rounded="lg"
            >
              <Select
                value={simulatedRole}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                variant="unstyled"
                size="xs"
                fontSize="2xs"
                fontWeight="semibold"
                color="rgba(255,255,255,0.7)"
                px={2}
                py={0}
                minW="130px"
                cursor="pointer"
                icon={<Box as="span" />}
              >
                <option value="super_admin">Super Admin</option>
                <option value="org_admin">Org Admin</option>
                <option value="sdr">SDR</option>
                <option value="manager">Manager</option>
                <option value="ae">AE</option>
                <option value="viewer">Viewer</option>
              </Select>
            </Flex>

            <Flex
              display={{ base: 'none', md: 'flex' }}
              align="center"
              gap={2}
              px={2.5}
              py={1}
              h="26px"
              rounded="lg"
              bg="rgba(255,255,255,0.04)"
            >
              <Box w={1.5} h={1.5} rounded="full" bg="#10b981" />
              <Text fontSize="2xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.08em" color="rgba(255,255,255,0.4)">
                Online
              </Text>
            </Flex>
          </HStack>
        </Flex>

        <Box flex={1} overflow="auto">
          {children}
        </Box>
      </Flex>

      {/* Cmd+K Search Palette */}
      <Modal isOpen={isSearchOpen} onClose={onSearchClose} size="lg">
        <ModalOverlay bg="rgba(0,0,0,0.6)" backdropFilter="blur(4px)" />
        <ModalContent bg="#12131a" border="1px solid rgba(255,255,255,0.08)" borderRadius="2xl" color="white" mt="15vh">
          <ModalHeader pb={2} borderBottomWidth={1} borderColor="rgba(255,255,255,0.06)">
            <Flex align="center" gap={2}>
              <Search size={16} className="text-indigo-400" />
              <Text fontSize="sm" fontWeight="bold">Global Search Palette</Text>
            </Flex>
          </ModalHeader>
          <ModalCloseButton color="gray.400" />
          <ModalBody p={4}>
            <VStack align="stretch" spacing={4}>
              <Input
                placeholder="Search leads, meetings, affiliates, templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant="filled"
                bg="rgba(0,0,0,0.2)"
                border="1px solid rgba(255,255,255,0.06)"
                _focus={{ bg: "rgba(0,0,0,0.3)", borderColor: "indigo.400" }}
                color="white"
                fontSize="sm"
                borderRadius="xl"
              />
              
              <Box maxH="280px" overflowY="auto">
                <Text fontSize="2xs" fontWeight="bold" textTransform="uppercase" color="gray.500" mb={2}>
                  Suggested Navigation
                </Text>
                <VStack align="stretch" spacing={1.5}>
                  {[
                    { label: 'Go to Deal Pipeline Board', view: 'JOURNEY', desc: 'Manage CRM stages and BANT scores' },
                    { label: 'Go to Meeting Intelligence', view: 'MEETINGS', desc: 'Audio transcriptions & action items' },
                    { label: 'Go to Email Sequence Manager', view: 'EMAIL_SEQUENCES', desc: 'Configure multi-touch drip campaigns' },
                    { label: 'Go to Affiliate Management', view: 'AFFILIATES', desc: 'Referred leads & commissions' },
                    { label: 'Go to Advanced Analytics', view: 'PIPELINE_ANALYTICS', desc: 'Conversion funnel & velocity' },
                  ]
                    .filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()) || item.desc.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item, i) => (
                      <Flex
                        key={i}
                        p={2.5}
                        bg="rgba(255,255,255,0.02)"
                        borderRadius="xl"
                        align="center"
                        justify="space-between"
                        cursor="pointer"
                        _hover={{ bg: "rgba(255,255,255,0.06)" }}
                        onClick={() => {
                          handleNav(item.view as AppView);
                          onSearchClose();
                        }}
                      >
                        <Box>
                          <Text fontSize="xs" fontWeight="semibold">{item.label}</Text>
                          <Text fontSize="3xs" color="gray.400">{item.desc}</Text>
                        </Box>
                        <ChevronRight size={14} className="text-gray-500" />
                      </Flex>
                    ))}
                </VStack>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
