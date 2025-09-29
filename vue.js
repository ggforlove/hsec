function detectVueRoot(root = document.body) {
  const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    if (node?.__vue__ || node?.__vue_app__ || node?._vnode) {
      console.debug("Vue root detected:", node);
      return node;
    }
    queue.push(...node.childNodes);
  }
  console.error("Vue root not found");
  return null;
}

function resolveComponentName(component) {
  if (!component) return '(no component)';
  if (typeof component === 'string') return component;
  if (component.name) return component.name;
  
  try {
    const asyncMatch = component.toString().match(/return (\w+)/);
    if (asyncMatch) return asyncMatch[1];
  } catch (e) {
    console.warn('Component name resolution failed:', e);
  }
  return '(dynamic)';
}

function resolveVueRouter(vueRoot) {
  const accessors = [
    () => vueRoot?.__vue_app__?.config?.globalProperties?.$router?.options?.routes,
    () => vueRoot?.__vue__?.$root?.$options?.router?.options?.routes,
    () => vueRoot?.__vue__?._router?.options?.routes
  ];

  for (const accessor of accessors) {
    try {
      const routes = accessor();
      if (routes) {
        console.debug("Vue Router resolved:", routes);
        return routes;
      }
    } catch (e) {
      console.warn("Router access error:", e);
    }
  }
  console.error("Vue Router not found");
  return null;
}

function traverseRoutes(routes, callback, parentPath = '') {
  if (!routes) return;

  routes.forEach(route => {
    const currentPath = [parentPath, route?.path]
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/');

    const routeData = {
      name: route.name || '(unnamed)',
      path: currentPath,
      component: resolveComponentName(route.component),
      redirect: route.redirect || '',
      alias: Array.isArray(route.alias) ? route.alias.join(', ') : route.alias || '',
      meta: route.meta ? JSON.stringify(route.meta) : '{}',
      childrenCount: route.children?.length || 0
    };

    callback(routeData);

    if (route.children) {
      traverseRoutes(route.children, callback, currentPath);
    }
  });
}

function exportToCSV(data, filename = 'vue_routes.csv') {
  try {
    const headers = ['Name', 'Path', 'Component', 'Redirect', 'Alias', 'Meta', 'Children'];
    const csvRows = [
      headers.join(','),
      ...data.map(item => headers.map(header => {
        const value = item[header.toLowerCase()] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (e) {
    console.error('CSV export failed:', e);
  }
}

function analyzeAndExport() {
  try {
    const vueRoot = detectVueRoot();
    if (!vueRoot) return;

    const routes = resolveVueRouter(vueRoot);
    if (!routes) return;

    const result = [];
    traverseRoutes(routes, route => result.push(route));

    console.table(result);
    exportToCSV(result);
  } catch (e) {
    console.error("Analysis failed:", e);
  }
}

// 执行分析并导出
analyzeAndExport();