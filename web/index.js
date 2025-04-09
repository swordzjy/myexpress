// 全局变量
let nextNodeId = 1; // 节点ID计数器
let nodes = {}; // 存储所有节点
let connections = {}; // 存储所有连接
let isDragging = false; // 拖拽状态
let draggedNodeId = null; // 被拖拽的节点ID
let isCanvasDragging = false; // 画布拖拽状态
let canvasOffset = { x: 0, y: 0 }; // 画布偏移量
let canvasScale = 1.0; // 画布缩放比例
let currentlyEditingNodeId = null; // 当前正在编辑的节点ID

// 初始化函数
function initFamilyTree() {
    const canvas = document.querySelector('.family-tree-svg');
    const canvasContainer = document.querySelector('.family-tree-canvas-container');
    
    // 不再需要画布点击事件来创建初始节点
    // canvas.addEventListener('click', handleCanvasClick);
    
    // 其他事件监听保持不变
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    document.addEventListener('mousemove', handleCanvasMouseMove);
    document.addEventListener('mouseup', handleCanvasMouseUp);
    
    canvasContainer.addEventListener('wheel', handleCanvasWheel);
    
    document.getElementById('reset-canvas').addEventListener('click', resetCanvas);
    document.getElementById('center-view').addEventListener('click', centerView);
    
    // 初始化属性编辑面板
    initNodeEditorPanel();
    
    // 自动在画布中心创建初始节点
    createInitialNodeAtCenter();
    
    // 显示就绪状态
    updateStatusMessage('就绪');
  }
  
  // 在画布中心创建初始节点
  function createInitialNodeAtCenter() {
    // 获取画布容器尺寸
    const canvasContainer = document.querySelector('.family-tree-canvas-container');
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    
    // 计算中心位置（考虑当前的画布偏移和缩放）
    const centerX = containerWidth / (2 * canvasScale) - canvasOffset.x / canvasScale;
    const centerY = containerHeight / (2 * canvasScale) - canvasOffset.y / canvasScale;
    
    // 创建初始节点
    createInitialNode(centerX, centerY);
  }

// <!-- 节点创建功能 -->

// 处理画布点击事件
function handleCanvasClick(event) {
    // 如果是拖拽结束，不创建节点
    if (isDragging || isCanvasDragging) {
      isDragging = false;
      isCanvasDragging = false;
      return;
    }
    
    // 获取点击坐标（考虑画布偏移和缩放）
    const point = getCanvasPoint(event);
    
    // 检查是否已有节点（防止误点击创建过多节点）
    const nodeCount = Object.keys(nodes).length;
    if (nodeCount === 0) {
      // 仅当没有节点时才创建初始节点
      createInitialNode(point.x, point.y);
    } else {
      // 如果已有节点，点击空白区域不再创建新节点
      const clickedOnNode = isPointOnAnyNode(point.x, point.y);
      if (!clickedOnNode) {
        // 可选：添加一些反馈，告诉用户如何添加更多节点
        showNotification('如需添加更多家族成员，请使用节点上的交互点A和B。', 'info');
      }
    }
  }

// 创建初始节点 S0
function createInitialNode(x, y) {
    // 检查是否已有节点（防止重复创建）
    const nodeCount = Object.keys(nodes).length;
    if (nodeCount > 0) return;
    
    const nodeId = `node-${nextNodeId++}`;
    
    // 创建节点数据
    const node = {
      id: nodeId,
      position: { x, y },
      name: {
        firstName: '我',
        lastName: '',
        middleName: '',
        nickname: ''
      },
      gender: null, // 未指定性别
      maritalStatus: null, // 未指定婚姻状态
      birthInfo: {
        date: null,
        place: ''
      },
      deathInfo: {
        isDeceased: false,
        date: null,
        place: ''
      },
      parents: [],
      children: [],
      siblings: [],
      spouses: [],
      style: {
        color: '',
        borderStyle: 'solid',
        imageVisible: true
      }
    };
    
    // 存储节点
    nodes[nodeId] = node;
    
    // 渲染节点
    renderNode(node);
    
    // 显示通知
    showNotification('初始节点已创建。双击节点编辑属性，或使用节点上的交互点A和B添加家族成员。', 'success');
    
    // 可选: 自动打开属性编辑面板
    // openNodeEditor(nodeId);
    
    return nodeId;
  }

// 渲染节点
function renderNode(node) {
  const svg = document.querySelector('.family-tree-svg');
  
  // 创建节点组
  const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodeGroup.setAttribute('id', node.id);
  nodeGroup.setAttribute('class', 'node');
  nodeGroup.setAttribute('transform', `translate(${node.position.x},${node.position.y})`);
  
  // 创建节点主体 (圆形)
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('r', '20');
  circle.setAttribute('fill', getNodeColor(node));
  circle.setAttribute('stroke', '#333');
  circle.setAttribute('stroke-width', '1.5');
  
  // 创建节点文本 (名字)
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dy', '5px');
  text.setAttribute('font-size', '12px');
  text.setAttribute('fill', '#000');
  text.textContent = getNodeDisplayName(node);
  
  // 创建交互点 A (顶部 - 添加父母)
  const pointA = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pointA.setAttribute('class', 'interaction-point point-a');
  pointA.setAttribute('cx', '0');
  pointA.setAttribute('cy', '-20');
  pointA.setAttribute('r', '5');
  pointA.setAttribute('fill', '#4CAF50'); // 绿色
  pointA.setAttribute('stroke', '#fff');
  pointA.setAttribute('stroke-width', '1');
  pointA.setAttribute('opacity', '0'); // 初始隐藏
  
  // 创建交互点 B (底部 - 添加配偶)
  const pointB = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  pointB.setAttribute('class', 'interaction-point point-b');
  pointB.setAttribute('cx', '0');
  pointB.setAttribute('cy', '20');
  pointB.setAttribute('r', '5');
  pointB.setAttribute('fill', '#2196F3'); // 蓝色
  pointB.setAttribute('stroke', '#fff');
  pointB.setAttribute('stroke-width', '1');
  pointB.setAttribute('opacity', '0'); // 初始隐藏
  
  // 添加元素到节点组
  nodeGroup.appendChild(circle);
  nodeGroup.appendChild(text);
  nodeGroup.appendChild(pointA);
  nodeGroup.appendChild(pointB);
  
  // 添加事件监听
  nodeGroup.addEventListener('mouseenter', () => handleNodeMouseEnter(node.id));
  nodeGroup.addEventListener('mouseleave', () => handleNodeMouseLeave(node.id));
  nodeGroup.addEventListener('dblclick', () => handleNodeDoubleClick(node.id));
  nodeGroup.addEventListener('mousedown', (e) => handleNodeMouseDown(e, node.id));
  
  // 为交互点 A 添加事件
  pointA.addEventListener('mouseenter', () => handleInteractionPointHover(node.id, 'A'));
  pointA.addEventListener('mouseleave', () => handleInteractionPointLeave(node.id, 'A'));
  pointA.addEventListener('click', (e) => {
    e.stopPropagation(); // 防止触发画布点击
    handleInteractionPointClick(node.id, 'A');
  });
  
  // 为交互点 B 添加事件
  pointB.addEventListener('mouseenter', () => handleInteractionPointHover(node.id, 'B'));
  pointB.addEventListener('mouseleave', () => handleInteractionPointLeave(node.id, 'B'));
  pointB.addEventListener('click', (e) => {
    e.stopPropagation(); // 防止触发画布点击
    handleInteractionPointClick(node.id, 'B');
  });
  
  // 添加节点组到SVG
  svg.appendChild(nodeGroup);
}

// 获取节点颜色
function getNodeColor(node) {
  // 如果节点有自定义颜色，使用自定义颜色
  if (node.style && node.style.color) {
    return node.style.color;
  }
  
  // 否则根据性别返回默认颜色
  switch (node.gender) {
    case 'male':
      return '#ADD8E6'; // 浅蓝色
    case 'female':
      return '#FFB6C1'; // 浅粉色
    default:
      return '#E0E0E0'; // 灰色 (未指定性别)
  }
}

// 获取节点显示名称
function getNodeDisplayName(node) {
  if (node.name.firstName || node.name.lastName) {
    return (node.name.firstName + ' ' + node.name.lastName).trim();
  } else if (node.name.nickname) {
    return node.name.nickname;
  } else {
    return '未命名';
  }
}



//  <!-- 节点悬停和交互点效果 -->
// <!-- 实现节点悬停和交互点悬停效果： -->
/// 处理节点鼠标进入
function handleNodeMouseEnter(nodeId) {
  // 显示交互点
  const pointA = document.querySelector(`#${nodeId} .point-a`);
  const pointB = document.querySelector(`#${nodeId} .point-b`);
  
  if (pointA) pointA.setAttribute('opacity', '1');
  if (pointB) pointB.setAttribute('opacity', '1');
  
  // 可选: 高亮显示节点
  const circle = document.querySelector(`#${nodeId} circle`);
  if (circle) {
    circle.setAttribute('stroke-width', '2');
    // 存储原始填充色用于恢复
    const originalFill = circle.getAttribute('fill');
    circle.dataset.originalFill = originalFill;
    // 稍微提亮填充色
    circle.setAttribute('fill', lightenColor(originalFill, 10));
  }
}

// 处理节点鼠标离开
function handleNodeMouseLeave(nodeId) {
  // 隐藏交互点
  const pointA = document.querySelector(`#${nodeId} .point-a`);
  const pointB = document.querySelector(`#${nodeId} .point-b`);
  
  if (pointA) pointA.setAttribute('opacity', '0');
  if (pointB) pointB.setAttribute('opacity', '0');
  
  // 恢复节点样式
  const circle = document.querySelector(`#${nodeId} circle`);
  if (circle) {
    circle.setAttribute('stroke-width', '1.5');
    // 恢复原始填充色
    if (circle.dataset.originalFill) {
      circle.setAttribute('fill', circle.dataset.originalFill);
    }
  }
}

// 处理交互点悬停
function handleInteractionPointHover(nodeId, pointType) {
  const point = document.querySelector(`#${nodeId} .point-${pointType.toLowerCase()}`);
  if (!point) return;
  
  // 放大交互点
  point.setAttribute('r', '6');
  
  // 添加提示文本
  const tip = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  tip.setAttribute('class', 'interaction-tip');
  tip.setAttribute('x', point.getAttribute('cx'));
  
  // 设置文本位置和内容
  if (pointType === 'A') {
    tip.setAttribute('y', '-30'); // 顶部点的提示在上方
    tip.textContent = '添加父母';
  } else {
    tip.setAttribute('y', '35'); // 底部点的提示在下方
    tip.textContent = '添加配偶';
  }
  
  tip.setAttribute('text-anchor', 'middle');
  tip.setAttribute('font-size', '10px');
  tip.setAttribute('fill', '#333');
  
  // 添加到节点组
  const nodeGroup = document.getElementById(nodeId);
  if (nodeGroup) {
    nodeGroup.appendChild(tip);
  }
}

// 处理交互点离开
function handleInteractionPointLeave(nodeId, pointType) {
  const point = document.querySelector(`#${nodeId} .point-${pointType.toLowerCase()}`);
  if (!point) return;
  
  // 恢复原始大小
  point.setAttribute('r', '5');
  
  // 移除提示文本
  const tip = document.querySelector(`#${nodeId} .interaction-tip`);
  if (tip) {
    tip.remove();
  }
}

// 辅助函数: 提亮颜色
function lightenColor(color, percent) {
  // 如果是命名颜色或RGB格式，转换为十六进制
  if (!color.startsWith('#')) {
    const tempElem = document.createElement('div');
    tempElem.style.color = color;
    document.body.appendChild(tempElem);
    color = window.getComputedStyle(tempElem).color;
    document.body.removeChild(tempElem);
    
    // 处理RGB格式
    if (color.startsWith('rgb')) {
      const rgb = color.match(/\d+/g).map(Number);
      color = '#' + rgb.map(c => {
        const hex = c.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    }
  }
  
  // 提亮十六进制颜色
  let r = parseInt(color.substring(1, 3), 16);
  let g = parseInt(color.substring(3, 5), 16);
  let b = parseInt(color.substring(5, 7), 16);
  
  r = Math.min(255, r + Math.floor(255 * (percent / 100)));
  g = Math.min(255, g + Math.floor(255 * (percent / 100)));
  b = Math.min(255, b + Math.floor(255 * (percent / 100)));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// <!-- 节点属性编辑面板 -->

// 处理节点双击事件
function handleNodeDoubleClick(nodeId) {
  openNodeEditor(nodeId);
}

// 初始化节点编辑面板
function initNodeEditorPanel() {
  const panelHtml = `
    <div class="editor-header">
      <h3>编辑家族成员</h3>
      <button class="close-button">&times;</button>
    </div>
    
    <div class="editor-tabs">
      <button class="tab-button active" data-tab="basic-info">基本信息</button>
      <button class="tab-button" data-tab="extended-info">扩展信息</button>
      <button class="tab-button" data-tab="appearance">外观设置</button>
    </div>
    
    <div class="tab-contents">
      <!-- 基本信息选项卡 -->
      <div class="tab-content active" id="basic-info">
        <div class="form-group">
          <label for="firstName">名字:</label>
          <input type="text" id="firstName" name="firstName">
        </div>
        
        <div class="form-group">
          <label for="lastName">姓氏:</label>
          <input type="text" id="lastName" name="lastName">
        </div>
        
        <div class="form-group">
          <label for="nickname">昵称:</label>
          <input type="text" id="nickname" name="nickname">
        </div>
        
        <div class="form-group">
          <label>性别:</label>
          <div class="radio-group">
            <label>
              <input type="radio" name="gender" value="male"> 男性
            </label>
            <label>
              <input type="radio" name="gender" value="female"> 女性
            </label>
            <label>
              <input type="radio" name="gender" value="null"> 未指定
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <label for="maritalStatus">婚姻状态:</label>
          <select id="maritalStatus" name="maritalStatus">
            <option value="">-- 请选择 --</option>
            <option value="married">已婚</option>
            <option value="unmarried">未婚</option>
          </select>
        </div>
      </div>
      
      <!-- 扩展信息选项卡 -->
      <div class="tab-content" id="extended-info">
        <fieldset>
          <legend>出生信息</legend>
          <div class="form-group">
            <label for="birthDate">出生日期:</label>
            <input type="date" id="birthDate" name="birthDate">
          </div>
          <div class="form-group">
            <label for="birthPlace">出生地点:</label>
            <input type="text" id="birthPlace" name="birthPlace">
          </div>
        </fieldset>
        
        <fieldset>
          <legend>死亡信息</legend>
          <div class="form-group">
            <label>
              <input type="checkbox" id="isDeceased" name="isDeceased"> 已故
            </label>
          </div>
          <div class="death-info" style="display: none;">
            <div class="form-group">
              <label for="deathDate">死亡日期:</label>
              <input type="date" id="deathDate" name="deathDate">
            </div>
            <div class="form-group">
              <label for="deathPlace">死亡地点:</label>
              <input type="text" id="deathPlace" name="deathPlace">
            </div>
          </div>
        </fieldset>
        
        <div class="form-group">
          <label for="biography">个人简介/备注:</label>
          <textarea id="biography" name="biography" rows="4"></textarea>
        </div>
      </div>
      
      <!-- 外观设置选项卡 -->
      <div class="tab-content" id="appearance">
        <div class="form-group">
          <label>节点颜色:</label>
          <div class="color-options">
            <label>
              <input type="radio" name="colorOption" value="auto" checked> 根据性别自动选择
            </label>
            <label>
              <input type="radio" name="colorOption" value="custom"> 自定义颜色
            </label>
            <input type="color" id="customColor" name="customColor" disabled>
          </div>
        </div>
        
        <div class="form-group">
          <label for="borderStyle">边框样式:</label>
          <select id="borderStyle" name="borderStyle">
            <option value="solid">实线</option>
            <option value="dashed">虚线</option>
            <option value="dotted">点线</option>
            <option value="double">双线</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="editor-footer">
      <button class="cancel-button">取消</button>
      <button class="save-button">保存</button>
    </div>
  `;
  
  // 设置面板HTML
  const editorPanel = document.querySelector('.node-editor-panel');
  editorPanel.innerHTML = panelHtml;
  
  // 添加事件监听
  
  // 关闭按钮
  editorPanel.querySelector('.close-button').addEventListener('click', closeNodeEditor);
  editorPanel.querySelector('.cancel-button').addEventListener('click', closeNodeEditor);
  
  // 保存按钮
  editorPanel.querySelector('.save-button').addEventListener('click', saveNodeData);
  
  // 选项卡切换
  editorPanel.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      // 移除所有活动状态
      editorPanel.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });
      editorPanel.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // 设置新的活动选项卡
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // 已故复选框控制死亡信息显示/隐藏
  editorPanel.querySelector('#isDeceased').addEventListener('change', event => {
    const deathInfo = editorPanel.querySelector('.death-info');
    deathInfo.style.display = event.target.checked ? 'block' : 'none';
  });
  
  // 颜色选择控制
  editorPanel.querySelectorAll('input[name="colorOption"]').forEach(radio => {
    radio.addEventListener('change', event => {
      const colorPicker = document.getElementById('customColor');
      colorPicker.disabled = event.target.value !== 'custom';
    });
  });
  
  // 添加拖拽功能
  makeEditorDraggable(editorPanel);
}

// 打开节点编辑器
function openNodeEditor(nodeId) {
  const node = nodes[nodeId];
  if (!node) return;
  
  // 存储当前编辑的节点ID
  currentlyEditingNodeId = nodeId;
  
  const editorPanel = document.querySelector('.node-editor-panel');
  
  // 填充表单数据
  
  // 基本信息
  editorPanel.querySelector('#firstName').value = node.name.firstName || '';
  editorPanel.querySelector('#lastName').value = node.name.lastName || '';
  editorPanel.querySelector('#nickname').value = node.name.nickname || '';
  
  // 性别
  editorPanel.querySelectorAll('input[name="gender"]').forEach(radio => {
    radio.checked = radio.value === (node.gender === null ? 'null' : node.gender);
  });
  
  // 婚姻状态
  editorPanel.querySelector('#maritalStatus').value = node.maritalStatus || '';
  
  // 扩展信息
  // 出生信息
  if (node.birthInfo.date) {
    editorPanel.querySelector('#birthDate').value = formatDateForInput(node.birthInfo.date);
  } else {
    editorPanel.querySelector('#birthDate').value = '';
  }
  editorPanel.querySelector('#birthPlace').value = node.birthInfo.place || '';
  
  // 死亡信息
  const isDeceased = editorPanel.querySelector('#isDeceased');
  isDeceased.checked = node.deathInfo.isDeceased;
  editorPanel.querySelector('.death-info').style.display = isDeceased.checked ? 'block' : 'none';
  
  if (node.deathInfo.date) {
    editorPanel.querySelector('#deathDate').value = formatDateForInput(node.deathInfo.date);
  } else {
    editorPanel.querySelector('#deathDate').value = '';
  }
  editorPanel.querySelector('#deathPlace').value = node.deathInfo.place || '';
  
  // 个人简介
  editorPanel.querySelector('#biography').value = node.biography || '';
  
  // 外观设置
  // 颜色选项
  const colorOption = node.style.color ? 'custom' : 'auto';
  editorPanel.querySelectorAll('input[name="colorOption"]').forEach(radio => {
    radio.checked = radio.value === colorOption;
  });
  
  const customColorPicker = editorPanel.querySelector('#customColor');
  customColorPicker.value = node.style.color || '#FFFFFF';
  customColorPicker.disabled = colorOption !== 'custom';
  
  // 边框样式
  editorPanel.querySelector('#borderStyle').value = node.style.borderStyle || 'solid';
  
  // 显示面板
  editorPanel.style.display = 'block';
  
  // 居中面板
  centerEditorPanel();
}

// 保存节点数据
function saveNodeData() {
  const nodeId = currentlyEditingNodeId;
  if (!nodeId) return;
  
  const node = nodes[nodeId];
  if (!node) return;
  
  const editorPanel = document.querySelector('.node-editor-panel');
  
  // 获取基本信息
  node.name.firstName = editorPanel.querySelector('#firstName').value.trim();
  node.name.lastName = editorPanel.querySelector('#lastName').value.trim();
  node.name.nickname = editorPanel.querySelector('#nickname').value.trim();
  
  // 获取性别
  const selectedGender = editorPanel.querySelector('input[name="gender"]:checked');
  node.gender = selectedGender ? (selectedGender.value === 'null' ? null : selectedGender.value) : null;
  
  // 获取婚姻状态
  node.maritalStatus = editorPanel.querySelector('#maritalStatus').value || null;
  
  // 获取扩展信息
  // 出生信息
  const birthDate = editorPanel.querySelector('#birthDate').value;
  node.birthInfo.date = birthDate ? new Date(birthDate).toISOString() : null;
  node.birthInfo.place = editorPanel.querySelector('#birthPlace').value.trim();
  
  // 死亡信息
  node.deathInfo.isDeceased = editorPanel.querySelector('#isDeceased').checked;
  const deathDate = editorPanel.querySelector('#deathDate').value;
  node.deathInfo.date = deathDate ? new Date(deathDate).toISOString() : null;
  node.deathInfo.place = editorPanel.querySelector('#deathPlace').value.trim();
  
  // 个人简介
  node.biography = editorPanel.querySelector('#biography').value.trim();
  
  // 外观设置
  // 颜色选项
  const colorOption = editorPanel.querySelector('input[name="colorOption"]:checked').value;
  if (colorOption === 'custom') {
    node.style.color = editorPanel.querySelector('#customColor').value;
  } else {
    node.style.color = '';
  }
  
  // 边框样式
  node.style.borderStyle = editorPanel.querySelector('#borderStyle').value;
  
  // 更新节点视觉效果
  updateNodeVisual(nodeId);
  
  // 关闭编辑面板
  closeNodeEditor();
  
  // 显示成功通知
  showNotification('节点信息已更新', 'success');
}

// 更新节点视觉效果
function updateNodeVisual(nodeId) {
  const node = nodes[nodeId];
  if (!node) return;
  
  const nodeElement = document.getElementById(nodeId);
  if (!nodeElement) return;
  
  // 更新节点圆形颜色
  const circle = nodeElement.querySelector('circle');
  if (circle) {
    circle.setAttribute('fill', getNodeColor(node));
    
    // 更新边框样式
    if (node.style.borderStyle === 'dashed') {
      circle.setAttribute('stroke-dasharray', '4,2');
    } else if (node.style.borderStyle === 'dotted') {
      circle.setAttribute('stroke-dasharray', '1,2');
    } else if (node.style.borderStyle === 'double') {
      circle.setAttribute('stroke-width', '3');
    } else {
      // 实线
      circle.setAttribute('stroke-dasharray', 'none');
      circle.setAttribute('stroke-width', '1.5');
    }
  }
  
  // 更新节点文本
  const text = nodeElement.querySelector('text');
  if (text) {
    text.textContent = getNodeDisplayName(node);
  }
  
  // 如果是已故状态，添加特殊标记
  const existingMark = nodeElement.querySelector('.deceased-mark');
  if (node.deathInfo.isDeceased) {
    if (!existingMark) {
      // 添加交叉线标记表示已故
      const mark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      mark.setAttribute('class', 'deceased-mark');
      mark.setAttribute('d', 'M -15,-15 L 15,15 M -15,15 L 15,-15');
      mark.setAttribute('stroke', '#000');
      mark.setAttribute('stroke-width', '1');
      mark.setAttribute('opacity', '0.5');
      nodeElement.appendChild(mark);
    }
  } else if (existingMark) {
    // 移除已故标记
    existingMark.remove();
  }
}

// 关闭节点编辑器
function closeNodeEditor() {
  const editorPanel = document.querySelector('.node-editor-panel');
  editorPanel.style.display = 'none';
  currentlyEditingNodeId = null;
}

// 使编辑面板可拖动
function makeEditorDraggable(editorPanel) {
  const header = editorPanel.querySelector('.editor-header');
  let isDragging = false;
  let offsetX, offsetY;
  
  header.addEventListener('mousedown', function(e) {
    // 只允许在标题栏上拖拽
    if (e.target.classList.contains('close-button')) return;
    
    isDragging = true;
    offsetX = e.clientX - editorPanel.offsetLeft;
    offsetY = e.clientY - editorPanel.offsetTop;
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    editorPanel.style.left = (e.clientX - offsetX) + 'px';
    editorPanel.style.top = (e.clientY - offsetY) + 'px';
  });
  
  document.addEventListener('mouseup', function() {
    isDragging = false;
  });
}

// 居中编辑面板
function centerEditorPanel() {
  const editorPanel = document.querySelector('.node-editor-panel');
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const panelWidth = editorPanel.offsetWidth;
  const panelHeight = editorPanel.offsetHeight;
  
  editorPanel.style.left = Math.max(0, (windowWidth - panelWidth) / 2) + 'px';
  editorPanel.style.top = Math.max(0, (windowHeight - panelHeight) / 3) + 'px'; // 居上三分之一处
}

// 辅助函数：将日期格式化为输入字段格式
function formatDateForInput(dateString) {
  const date = new Date(dateString);
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// <!-- 交互点点击处理 -->

// 处理交互点点击
function handleInteractionPointClick(nodeId, pointType) {
  // 取消任何进行中的拖拽
  isDragging = false;
  
  if (pointType === 'A') {
    // 点击顶部交互点 A - 添加父母
    addParents(nodeId);
  } else if (pointType === 'B') {
    // 点击底部交互点 B - 显示添加配偶选项
    showSpouseOptionsMenu(nodeId);
  }
}

// 添加父母
function addParents(nodeId) {
  const node = nodes[nodeId];
  if (!node) return;
  
  // 检查是否已有父母
  if (node.parents.length > 0) {
    showNotification('此成员已有父母。若要修改，请先移除现有父母关系。', 'warning');
    return;
  }
  
  // 在子节点上方创建父母节点
  const fatherId = `node-${nextNodeId++}`;
  const motherId = `node-${nextNodeId++}`;
  
  // 计算父母位置
  const childX = node.position.x;
  const childY = node.position.y;
  const parentY = childY - 100; // 父母在上方
  
  // 创建父亲节点
  const father = {
    id: fatherId,
    position: { x: childX - 60, y: parentY }, // 父亲在左侧
    name: {
      firstName: '父亲',
      lastName: node.name.lastName, // 继承子女姓氏
      middleName: '',
      nickname: ''
    },
    gender: 'male',
    maritalStatus: 'married',
    birthInfo: { date: null, place: '' },
    deathInfo: { isDeceased: false, date: null, place: '' },
    parents: [],
    children: [nodeId], // 添加子女引用
    siblings: [],
    spouses: [{ id: motherId, type: 'first' }], // 添加配偶引用
    style: { color: '', borderStyle: 'solid', imageVisible: true }
  };
  
  // 创建母亲节点
  const mother = {
    id: motherId,
    position: { x: childX + 60, y: parentY }, // 母亲在右侧
    name: {
      firstName: '母亲',
      lastName: '',
      middleName: '',
      nickname: ''
    },
    gender: 'female',
    maritalStatus: 'married',
    birthInfo: { date: null, place: '' },
    deathInfo: { isDeceased: false, date: null, place: '' },
    parents: [],
    children: [nodeId], // 添加子女引用
    siblings: [],
    spouses: [{ id: fatherId, type: 'first' }], // 添加配偶引用
    style: { color: '', borderStyle: 'solid', imageVisible: true }
  };
  
  // 更新子女节点的父母引用
  node.parents = [fatherId, motherId];
  
  // 存储父母节点
  nodes[fatherId] = father;
  nodes[motherId] = mother;
  
  // 创建婚姻连接（水平线，连接父母）
  const marriageConnectionId = `connection-${generateUniqueId()}`;
  const marriageConnection = {
    id: marriageConnectionId,
    type: 'horizontal-marriage',
    sourceId: fatherId,
    targetId: motherId,
    points: [
      { x: father.position.x, y: father.position.y },
      { x: mother.position.x, y: mother.position.y }
    ]
  };
  
  // 创建父子关系连接（垂直线，连接父母水平线与子女）
  const parentChildConnectionId = `connection-${generateUniqueId()}`;
  const parentChildConnection = {
    id: parentChildConnectionId,
    type: 'parent-child',
    sourceId: marriageConnectionId, // 源是婚姻连接
    targetId: nodeId, // 目标是子女节点
    points: [
      { x: childX, y: parentY }, // 从父母连接线中心
      { x: childX, y: childY } // 到子女节点
    ]
  };
  
  // 存储连接
  connections[marriageConnectionId] = marriageConnection;
  connections[parentChildConnectionId] = parentChildConnection;
  
  // 渲染父母节点和连接
  renderNode(father);
  renderNode(mother);
  renderConnection(marriageConnection);
  renderConnection(parentChildConnection);
  
  // 显示通知
  showNotification('已添加父母节点。双击节点可以编辑详细信息。', 'success');
}

// 显示添加配偶选项菜单
function showSpouseOptionsMenu(nodeId) {
  const node = nodes[nodeId];
  if (!node) return;
  
  // 检查现有配偶
  const hasFirstSpouse = node.spouses.some(s => s.type === 'first');
  const hasSecondSpouse = node.spouses.some(s => s.type === 'second');
  
  // 创建菜单元素
  const menu = document.createElement('div');
  menu.className = 'spouse-options-menu';
  
  // 设置菜单位置
  const nodeElement = document.getElementById(nodeId);
  if (!nodeElement) return;
  
  const nodeRect = nodeElement.getBoundingClientRect();
  menu.style.position = 'absolute';
  menu.style.left = (nodeRect.left + nodeRect.width / 2) + 'px';
  menu.style.top = (nodeRect.bottom + 10) + 'px';
  
  // 添加菜单标题
  const menuTitle = document.createElement('div');
  menuTitle.className = 'menu-title';
  menuTitle.textContent = '添加配偶';
  menu.appendChild(menuTitle);
  
  // 添加选项
  const optionsList = document.createElement('ul');
  
  // 初婚选项（水平连接）
  const firstOption = document.createElement('li');
  if (!hasFirstSpouse) {
    firstOption.innerHTML = '<i class="icon-horizontal"></i> 初次婚姻（水平连接）';
    firstOption.addEventListener('click', () => {
      menu.remove(); // 移除菜单
      addSpouse(nodeId, 'first');
    });
  } else {
    firstOption.className = 'disabled';
    firstOption.innerHTML = '<i class="icon-horizontal"></i> 初次婚姻（已存在）';
  }
  
  // // 二婚选项（垂直连接）
  // const secondOption = document.createElement('li');
  // if (!hasSecondSpouse) {
  //   secondOption.innerHTML = '<i class="icon-vertical"></i> 二次婚姻（垂直连接）';
  //   secondOption.addEventListener('click', () => {
  //     menu.remove(); // 移除菜单
  //     addSpouse(nodeId, 'second');
  //   });
  // } else {
  //   secondOption.className = 'disabled';
  //   secondOption.innerHTML = '<i class="icon-vertical"></i> 二次婚姻（已存在）';
  // }
  
  optionsList.appendChild(firstOption);
  //optionsList.appendChild(secondOption);
  menu.appendChild(optionsList);
  
  // 添加关闭菜单的事件
  document.addEventListener('click', function closeMenu(e) {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  });
  
  // 添加菜单到文档
  document.body.appendChild(menu);
}

// 添加配偶
function addSpouse(nodeId, spouseType) {
  const node = nodes[nodeId];
  if (!node) return;
  
  // 创建配偶节点
  const spouseId = `node-${nextNodeId++}`;
  
  // 计算配偶位置
  let spousePosition;
  if (spouseType === 'first') {
    // 水平婚姻 - 配偶在右侧
    spousePosition = {
      x: node.position.x + 120,
      y: node.position.y
    };
  } else {
    // 垂直婚姻 - 配偶在下方
    spousePosition = {
      x: node.position.x,
      y: node.position.y + 120
    };
  }
  
  // 创建配偶节点数据
  const spouse = {
    id: spouseId,
    position: spousePosition,
    name: {
      firstName: '配偶',
      lastName: '',
      middleName: '',
      nickname: ''
    },
    // 默认配偶性别与当前节点相反
    gender: node.gender === 'male' ? 'female' : node.gender === 'female' ? 'male' : null,
    maritalStatus: 'married',
    birthInfo: { date: null, place: '' },
    deathInfo: { isDeceased: false, date: null, place: '' },
    parents: [],
    children: [],
    siblings: [],
    spouses: [{ id: nodeId, type: spouseType }], // 添加配偶引用
    style: { color: '', borderStyle: 'solid', imageVisible: true }
  };
  
  // 更新当前节点的配偶列表
  node.spouses.push({ id: spouseId, type: spouseType });
  node.maritalStatus = 'married'; // 更新婚姻状态
  
  // 存储配偶节点
  nodes[spouseId] = spouse;
  
  // 创建婚姻连接
  const connectionId = `connection-${generateUniqueId()}`;
  const connection = {
    id: connectionId,
    type: spouseType === 'first' ? 'horizontal-marriage' : 'vertical-marriage',
    sourceId: nodeId,
    targetId: spouseId,
    points: [
      { x: node.position.x, y: node.position.y },
      { x: spouse.position.x, y: spouse.position.y }
    ]
  };
  
  // 存储连接
  connections[connectionId] = connection;
  
  // 渲染配偶节点和连接
  renderNode(spouse);
  renderConnection(connection);
  updateNodeVisual(nodeId); // 更新当前节点以反映婚姻状态
  
  // 显示通知
  showNotification('已添加配偶节点。双击节点可以编辑详细信息。', 'success');
}


// 渲染连接
function renderConnection(connection) {
  const svg = document.querySelector('.family-tree-svg');
  
  // 创建路径元素
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.id = connection.id;
  path.setAttribute('class', `connection ${connection.type}`);
  
  // 生成路径数据
  let d = '';
  if (connection.points && connection.points.length >= 2) {
    d = `M ${connection.points[0].x} ${connection.points[0].y}`;
    
    for (let i = 1; i < connection.points.length; i++) {
      d += ` L ${connection.points[i].x} ${connection.points[i].y}`;
    }
  }
  
  path.setAttribute('d', d);
  
  // 设置线条样式
  path.setAttribute('stroke', getConnectionColor(connection.type));
  path.setAttribute('stroke-width', '2');
  path.setAttribute('fill', 'none');
  
  // 根据连接类型设置线条样式
  if (connection.type === 'parent-child') {
    // 可选：为父子关系连接设置不同的线条样式
    // 例如使用虚线
    // path.setAttribute('stroke-dasharray', '5,3');
  }
  
  // 添加到SVG元素，注意要放在节点下面
  const firstNode = svg.querySelector('.node');
  if (firstNode) {
    svg.insertBefore(path, firstNode);
  } else {
    svg.appendChild(path);
  }
  
  // 如果是父子关系连接，且源是婚姻连接
  if (connection.type === 'parent-child' && connection.sourceId.startsWith('connection')) {
    // 在水平父母连接上添加"+"按钮，用于添加兄弟姐妹
    addSiblingAddButton(connection);
  }
}

// 获取连接颜色
function getConnectionColor(connectionType) {
  switch (connectionType) {
    case 'horizontal-marriage':
    case 'vertical-marriage':
      return '#FF6B6B'; // 红色表示婚姻关系
    case 'parent-child':
      return '#4D96FF'; // 蓝色表示父子关系
    default:
      return '#333333'; // 默认深灰色
  }
}

// 添加兄弟姐妹添加按钮
function addSiblingAddButton(connection) {
  // 确认是父子关系连接
  if (connection.type !== 'parent-child' || !connection.sourceId.startsWith('connection')) {
    return;
  }
  
  // 获取父母婚姻连接
  const marriageConnection = connections[connection.sourceId];
  if (!marriageConnection) return;
  
  const svg = document.querySelector('.family-tree-svg');
  
  // 计算按钮位置 - 婚姻连接的中点
  const xPos = (marriageConnection.points[0].x + marriageConnection.points[1].x) / 2;
  const yPos = marriageConnection.points[0].y;
  
  // 创建按钮组
  const buttonGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  buttonGroup.setAttribute('class', 'add-sibling-button');
  buttonGroup.setAttribute('data-parent-connection', connection.sourceId);
  
  // 创建按钮圆形
  const buttonCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  buttonCircle.setAttribute('cx', xPos);
  buttonCircle.setAttribute('cy', yPos);
  buttonCircle.setAttribute('r', '6');
  buttonCircle.setAttribute('fill', '#4CAF50'); // 绿色
  buttonCircle.setAttribute('stroke', '#fff');
  buttonCircle.setAttribute('stroke-width', '1');
  
  // 创建加号符号
  const buttonPlus = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  buttonPlus.setAttribute('x', xPos);
  buttonPlus.setAttribute('y', yPos + 3); // 微调使"+"垂直居中
  buttonPlus.setAttribute('text-anchor', 'middle');
  buttonPlus.setAttribute('font-size', '12px');
  buttonPlus.setAttribute('fill', '#ffffff');
  buttonPlus.setAttribute('pointer-events', 'none'); // 防止文本拦截鼠标事件
  buttonPlus.textContent = '+';
  
  // 添加悬停效果
  buttonCircle.addEventListener('mouseenter', () => {
    buttonCircle.setAttribute('r', '7');
    buttonCircle.setAttribute('fill', '#66BB6A'); // 稍亮的绿色
    
    // 显示提示
    const tip = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tip.setAttribute('class', 'button-tip');
    tip.setAttribute('x', xPos);
    tip.setAttribute('y', yPos - 10);
    tip.setAttribute('text-anchor', 'middle');
    tip.setAttribute('font-size', '10px');
    tip.setAttribute('fill', '#333');
    tip.textContent = '添加兄弟姐妹';
    
    buttonGroup.appendChild(tip);
  });
  
  buttonCircle.addEventListener('mouseleave', () => {
    buttonCircle.setAttribute('r', '6');
    buttonCircle.setAttribute('fill', '#4CAF50');
    
    // 移除提示
    const tip = buttonGroup.querySelector('.button-tip');
    if (tip) tip.remove();
  });
  
  // 添加点击事件 - 添加兄弟姐妹
  buttonCircle.addEventListener('click', (e) => {
    e.stopPropagation(); // 防止触发画布点击
    const parentConnectionId = buttonGroup.getAttribute('data-parent-connection');
    addSibling(parentConnectionId);
  });
  
  // 添加到按钮组
  buttonGroup.appendChild(buttonCircle);
  buttonGroup.appendChild(buttonPlus);
  
  // 添加到SVG
  svg.appendChild(buttonGroup);
}

// 添加兄弟姐妹
function addSibling(parentConnectionId) {
  // 获取父母婚姻连接
  const marriageConnection = connections[parentConnectionId];
  if (!marriageConnection) return;
  
  // 获取父母节点
  const fatherId = marriageConnection.sourceId;
  const motherId = marriageConnection.targetId;
  const father = nodes[fatherId];
  const mother = nodes[motherId];
  
  if (!father || !mother) return;
  
  // 确定新兄弟姐妹的位置
  
  // 获取所有现有子女
  const childrenIds = [...new Set([...father.children, ...mother.children])];
  
  // 收集所有子女的X坐标
  const childrenXPositions = childrenIds.map(id => {
    const child = nodes[id];
    return child ? child.position.x : null;
  }).filter(x => x !== null).sort((a, b) => a - b);
  
  // 计算新兄弟姐妹的位置
  let siblingX, siblingY;
  
  if (childrenXPositions.length > 0) {
    // 放在最右侧的子女右边
    siblingX = childrenXPositions[childrenXPositions.length - 1] + 80;
  } else {
    // 如果没有现有子女，放在父母中间位置
    siblingX = (father.position.x + mother.position.x) / 2;
  }
  
  // Y坐标 - 在父母下方
  siblingY = father.position.y + 100;
  
  // 创建兄弟姐妹节点
  const siblingId = `node-${nextNodeId++}`;
  const sibling = {
    id: siblingId,
    position: { x: siblingX, y: siblingY },
    name: {
      firstName: '兄弟姐妹',
      lastName: father.name.lastName, // 继承父亲姓氏
      middleName: '',
      nickname: ''
    },
    gender: null, // 未指定性别
    maritalStatus: null,
    birthInfo: { date: null, place: '' },
    deathInfo: { isDeceased: false, date: null, place: '' },
    parents: [fatherId, motherId], // 添加父母引用
    children: [],
    siblings: [...childrenIds], // 添加已有子女作为兄弟姐妹
    spouses: [],
    style: { color: '', borderStyle: 'solid', imageVisible: true }
  };
  
  // 更新父母节点添加新子女
  father.children.push(siblingId);
  mother.children.push(siblingId);
  
  // 更新所有现有子女的兄弟姐妹列表
  for (const childId of childrenIds) {
    const child = nodes[childId];
    if (child) {
      child.siblings.push(siblingId); // 添加新兄弟姐妹
      // 注意：这里应该检查并防止重复添加
    }
  }
  
  // 存储兄弟姐妹节点
  nodes[siblingId] = sibling;
  
  // 创建父子关系连接
  const connectionId = `connection-${generateUniqueId()}`;
  const connection = {
    id: connectionId,
    type: 'parent-child',
    sourceId: parentConnectionId, // 源是父母婚姻连接
    targetId: siblingId, // 目标是兄弟姐妹节点
    points: [
      { x: siblingX, y: father.position.y }, // 从父母连接线
      { x: siblingX, y: siblingY } // 到兄弟姐妹节点
    ]
  };
  
  // 存储连接
  connections[connectionId] = connection;
  
  // 渲染兄弟姐妹节点和连接
  renderNode(sibling);
  renderConnection(connection);
  
  // 显示通知
  showNotification('已添加兄弟姐妹节点。双击节点可以编辑详细信息。', 'success');
}

// 处理节点拖拽
function handleNodeMouseDown(event, nodeId) {
  // 如果是双击或点击交互点，不启动拖拽
  if (event.target.classList.contains('interaction-point')) {
    return;
  }
  
  // 记录拖拽开始状态
  isDragging = true;
  draggedNodeId = nodeId;
  
  // 记录初始位置
  const node = nodes[nodeId];
  const startX = event.clientX;
  const startY = event.clientY;
  const originalPosition = { ...node.position };
  
  // 节点拖拽处理函数
  function handleNodeDrag(moveEvent) {
    if (!isDragging || draggedNodeId !== nodeId) return;
    
    // 计算移动距离
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    
    // 计算新位置
    const newX = originalPosition.x + dx / canvasScale;
    const newY = originalPosition.y + dy / canvasScale;
    
    // 更新节点位置
    updateNodePosition(nodeId, newX, newY);
  }
  
  // 拖拽结束处理函数
  function handleNodeDragEnd() {
    if (isDragging && draggedNodeId === nodeId) {
      isDragging = false;
      draggedNodeId = null;
      
      // 移除临时事件监听
      document.removeEventListener('mousemove', handleNodeDrag);
      document.removeEventListener('mouseup', handleNodeDragEnd);
    }
  }
  
  // 添加临时事件监听
  document.addEventListener('mousemove', handleNodeDrag);
  document.addEventListener('mouseup', handleNodeDragEnd);
  
  // 阻止事件冒泡和默认行为
  event.stopPropagation();
  event.preventDefault();
}

// 更新节点位置
function updateNodePosition(nodeId, newX, newY) {
  const node = nodes[nodeId];
  if (!node) return;
  
  // 更新节点数据
  node.position.x = newX;
  node.position.y = newY;
  
  // 更新节点视觉位置
  const nodeElement = document.getElementById(nodeId);
  if (nodeElement) {
    nodeElement.setAttribute('transform', `translate(${newX},${newY})`);
  }
  
  // 更新相关连接
  updateConnectedLines(nodeId);
}

// 更新与节点相关的所有连接线
function updateConnectedLines(nodeId) {
  // 查找所有涉及此节点的连接
  Object.keys(connections).forEach(connectionId => {
    const connection = connections[connectionId];
    
    if (connection.sourceId === nodeId || connection.targetId === nodeId) {
      updateConnectionPoints(connectionId);
    }
    
    // 处理父子关系连接的父母端（其源是婚姻连接）
    if (connection.type === 'parent-child' && connection.sourceId.startsWith('connection')) {
      const marriageConnection = connections[connection.sourceId];
      if (marriageConnection && 
          (marriageConnection.sourceId === nodeId || marriageConnection.targetId === nodeId)) {
        updateConnectionPoints(connectionId);
      }
    }
  });
}

// 更新连接线的路径点
function updateConnectionPoints(connectionId) {
  const connection = connections[connectionId];
  if (!connection) return;
  
  // 根据连接类型和端点更新路径
  if (connection.type === 'horizontal-marriage' || connection.type === 'vertical-marriage') {
    // 婚姻连接 - 直接连接两个节点
    const sourceNode = nodes[connection.sourceId];
    const targetNode = nodes[connection.targetId];
    
    if (sourceNode && targetNode) {
      connection.points = [
        { x: sourceNode.position.x, y: sourceNode.position.y },
        { x: targetNode.position.x, y: targetNode.position.y }
      ];
    }
  } else if (connection.type === 'parent-child') {
    // 父子关系连接 - 可能连接到另一个连接
    const targetNode = nodes[connection.targetId];
    
         if (connection.sourceId.startsWith('connection') && targetNode) {
      // 父母是通过婚姻连接的
      const marriageConnection = connections[connection.sourceId];
      
      if (marriageConnection) {
        // 获取婚姻连接的中点（水平位置）
        let parentX = targetNode.position.x; // 默认与子女节点对齐
        const parentY = marriageConnection.points[0].y; // 父母水平线的Y坐标
        
        connection.points = [
          { x: parentX, y: parentY }, // 从父母连接线
          { x: targetNode.position.x, y: targetNode.position.y } // 到子女节点
        ];
        
        // 更新父母线上的添加兄弟姐妹按钮位置
        updateSiblingAddButton(connection.sourceId);
      }
    } else {
      // 直接父子关系（单亲）
      const sourceNode = nodes[connection.sourceId];
      const targetNode = nodes[connection.targetId];
      
      if (sourceNode && targetNode) {
        connection.points = [
          { x: sourceNode.position.x, y: sourceNode.position.y },
          { x: targetNode.position.x, y: targetNode.position.y }
        ];
      }
    }
  }
  
  // 更新连接视觉表示
  updateConnectionVisual(connectionId);
}

// 更新添加兄弟姐妹按钮的位置
function updateSiblingAddButton(connectionId) {
  const marriageConnection = connections[connectionId];
  if (!marriageConnection) return;
  
  // 查找按钮元素
  const buttonGroup = document.querySelector(`.add-sibling-button[data-parent-connection="${connectionId}"]`);
  if (!buttonGroup) return;
  
  // 计算新的按钮位置
  const xPos = (marriageConnection.points[0].x + marriageConnection.points[1].x) / 2;
  const yPos = marriageConnection.points[0].y;
  
  // 更新按钮元素位置
  const buttonCircle = buttonGroup.querySelector('circle');
  const buttonText = buttonGroup.querySelector('text');
  const buttonTip = buttonGroup.querySelector('.button-tip');
  
  if (buttonCircle) {
    buttonCircle.setAttribute('cx', xPos);
    buttonCircle.setAttribute('cy', yPos);
  }
  
  if (buttonText) {
    buttonText.setAttribute('x', xPos);
    buttonText.setAttribute('y', yPos + 3);
  }
  
  if (buttonTip) {
    buttonTip.setAttribute('x', xPos);
    buttonTip.setAttribute('y', yPos - 10);
  }
}

// 更新连接的视觉表示
function updateConnectionVisual(connectionId) {
  const connection = connections[connectionId];
  if (!connection) return;
  
  // 获取连接的路径元素
  const pathElement = document.getElementById(connectionId);
  if (!pathElement) return;
  
  // 生成新的路径数据
  let d = '';
  if (connection.points && connection.points.length >= 2) {
    d = `M ${connection.points[0].x} ${connection.points[0].y}`;
    
    for (let i = 1; i < connection.points.length; i++) {
      d += ` L ${connection.points[i].x} ${connection.points[i].y}`;
    }
  }
  
  // 更新路径
  pathElement.setAttribute('d', d);
}

//  画布导航和工具函数

 // 处理画布鼠标按下事件 - 启动画布拖拽
function handleCanvasMouseDown(event) {
  // 如果点击的是节点或交互元素，不启动画布拖拽
  if (event.target.closest('.node') || 
      event.target.closest('.connection') || 
      event.target.closest('.add-sibling-button')) {
    return;
  }
  
  isCanvasDragging = true;
  
  // 记录起始位置
  const startX = event.clientX;
  const startY = event.clientY;
  const startOffset = { ...canvasOffset };
  
  // 临时函数：处理画布拖拽
  function handleCanvasDrag(moveEvent) {
    if (!isCanvasDragging) return;
    
    // 计算拖拽距离
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    
    // 更新画布偏移
    canvasOffset.x = startOffset.x + dx;
    canvasOffset.y = startOffset.y + dy;
    
    // 应用变换
    updateCanvasTransform();
  }
  
  // 临时函数：结束画布拖拽
  function endCanvasDrag() {
    isCanvasDragging = false;
    document.removeEventListener('mousemove', handleCanvasDrag);
    document.removeEventListener('mouseup', endCanvasDrag);
  }
  
  // 添加临时事件监听
  document.addEventListener('mousemove', handleCanvasDrag);
  document.addEventListener('mouseup', endCanvasDrag);
  
  // 防止默认行为和事件冒泡
  event.preventDefault();
  event.stopPropagation();
}

// 处理画布鼠标移动 - 更新坐标显示
function handleCanvasMouseMove(event) {
  // 获取画布容器
  const canvasContainer = document.querySelector('.family-tree-canvas-container');
  const rect = canvasContainer.getBoundingClientRect();
  
  // 计算相对于画布左上角的坐标
  const x = (event.clientX - rect.left - canvasOffset.x) / canvasScale;
  const y = (event.clientY - rect.top - canvasOffset.y) / canvasScale;
  
  // 更新坐标显示
  document.querySelector('.status-coordinates').textContent = `坐标: ${Math.round(x)}, ${Math.round(y)}`;
}
// 处理画布鼠标抬起 - 结束拖拽
function handleCanvasMouseUp() {
    isCanvasDragging = false;
  }
// 处理画布滚轮事件 - 缩放
function handleCanvasWheel(event) {
  // 阻止默认滚动行为
  event.preventDefault();
  
  // 获取鼠标位置（相对于视口）
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  
  // 获取画布容器
  const canvasContainer = document.querySelector('.family-tree-canvas-container');
  const rect = canvasContainer.getBoundingClientRect();
  
  // 计算鼠标相对于画布的位置
  const mouseCanvasX = mouseX - rect.left;
  const mouseCanvasY = mouseY - rect.top;
  
  // 计算鼠标在缩放前的真实坐标
  const beforeZoomX = (mouseCanvasX - canvasOffset.x) / canvasScale;
  const beforeZoomY = (mouseCanvasY - canvasOffset.y) / canvasScale;
  
  // 调整缩放级别
  const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9; // 缩放因子
  const newScale = Math.max(0.1, Math.min(5, canvasScale * zoomFactor)); // 限制缩放范围
  
  // 更新缩放级别
  canvasScale = newScale;
  
  // 计算鼠标在缩放后应该对应的画布位置
  const afterZoomX = beforeZoomX * canvasScale;
  const afterZoomY = beforeZoomY * canvasScale;
  
  // 调整偏移，使鼠标位置保持不变
  canvasOffset.x += mouseCanvasX - (afterZoomX + canvasOffset.x);
  canvasOffset.y += mouseCanvasY - (afterZoomY + canvasOffset.y);
  
  // 应用变换
  updateCanvasTransform();
  
  // 更新状态栏
  document.querySelector('.status-message').textContent = `缩放: ${Math.round(canvasScale * 100)}%`;
}

// 更新画布变换
function updateCanvasTransform() {
  const svg = document.querySelector('.family-tree-svg');
  const transform = `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`;
  svg.style.transform = transform;
}

// 重置画布
function resetCanvas() {
  if (confirm('确定要重置画布吗？这将清除所有节点和连接。')) {
    // 清空节点和连接
    nodes = {};
    connections = {};
    nextNodeId = 1;
    
    // 清空SVG内容
    const svg = document.querySelector('.family-tree-svg');
    svg.innerHTML = '';
    
    // 重置画布变换
    canvasOffset = { x: 0, y: 0 };
    canvasScale = 1.0;
    updateCanvasTransform();
    
    // 更新状态
    updateStatusMessage('画布已重置');
  }
}

// 居中视图
function centerView() {
  // 如果没有节点，无需居中
  const nodeCount = Object.keys(nodes).length;
  if (nodeCount === 0) {
    updateStatusMessage('没有节点可以居中');
    return;
  }
  
  // 计算所有节点的边界框
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  Object.values(nodes).forEach(node => {
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y);
  });
  
  // 添加边距
  minX -= 50;
  maxX += 50;
  minY -= 50;
  maxY += 50;
  
  // 计算边界框中心
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // 获取画布容器尺寸
  const canvasContainer = document.querySelector('.family-tree-canvas-container');
  const containerWidth = canvasContainer.clientWidth;
  const containerHeight = canvasContainer.clientHeight;
  
  // 计算合适的缩放比例
  const boundWidth = maxX - minX;
  const boundHeight = maxY - minY;
  
  if (boundWidth > 0 && boundHeight > 0) {
    const scaleX = containerWidth / boundWidth;
    const scaleY = containerHeight / boundHeight;
    canvasScale = Math.min(scaleX, scaleY, 1.5) * 0.9; // 限制最大缩放并留出一些边距
  } else {
    canvasScale = 1.0;
  }
  
  // 计算新的偏移
  canvasOffset.x = containerWidth / 2 - centerX * canvasScale;
  canvasOffset.y = containerHeight / 2 - centerY * canvasScale;
  
  // 应用变换
  updateCanvasTransform();
  
  // 更新状态
  updateStatusMessage('视图已居中');
}

// 更新状态消息
function updateStatusMessage(message) {
  document.querySelector('.status-message').textContent = message;
}

// 显示通知
function showNotification(message, type = 'info') {
  // 移除现有通知
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => {
    notification.remove();
  });
  
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // 添加关闭按钮
  const closeBtn = document.createElement('span');
  closeBtn.className = 'notification-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => notification.remove());
  notification.appendChild(closeBtn);
  
  // 添加到文档
  document.body.appendChild(notification);
  
  // 自动关闭
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}

// 获取画布点击的实际坐标（考虑偏移和缩放）
function getCanvasPoint(event) {
  const canvasContainer = document.querySelector('.family-tree-canvas-container');
  const rect = canvasContainer.getBoundingClientRect();
  
  return {
    x: (event.clientX - rect.left - canvasOffset.x) / canvasScale,
    y: (event.clientY - rect.top - canvasOffset.y) / canvasScale
  };
}

// 检查点是否在任何节点上
function isPointOnAnyNode(x, y) {
  const nodeRadius = 20; // 节点半径
  
  return Object.values(nodes).some(node => {
    const dx = node.position.x - x;
    const dy = node.position.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= nodeRadius;
  });
}

// 生成唯一ID
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}