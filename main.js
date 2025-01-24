/**
 * 3D球形照片墙主程序
 * @author Claude
 */

// 场景初始化
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 在场景初始化后添加
const originalZ = camera.position.z; // 存储相机的原始Z位置

// 修改场景背景为黑色
scene.background = new THREE.Color(0x000000);

// 调整相机视角和位置
camera.fov = 65; // 增大视野角度
camera.position.z = 16; // 减小观察距离
camera.updateProjectionMatrix();

/**
 * 创建照片精灵
 * @param {string} imageUrl - 照片URL
 * @param {number} x - x坐标
 * @param {number} y - y坐标
 * @param {number} z - z坐标
 * @returns {THREE.Sprite} 照片精灵对象
 */
function createPhotoSprite(imageUrl, x, y, z) {
    const textureLoader = new THREE.TextureLoader();
    // 设置跨域加载
    textureLoader.crossOrigin = '';
    
    const map = textureLoader.load(imageUrl, 
        // 加载成功回调
        function(texture) {
            texture.needsUpdate = true;
        },
        // 加载进度回调
        undefined,
        // 加载错误回调
        function(err) {
            console.error('Error loading texture:', err);
        }
    );
    
    const material = new THREE.SpriteMaterial({ 
        map: map,
        depthTest: true,
        depthWrite: true,
        transparent: true,
        opacity: 0.95
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    
    // 设置照片的宽高比为3:2（常见的照片比例）
    const aspectRatio = 3/2;
    const width = 0.85;
    const height = width / aspectRatio;
    
    sprite.scale.set(width, height, 1);
    sprite.userData.originalScale = { x: width, y: height, z: 1 };
    sprite.userData.originalPosition = { x, y, z };
    return sprite;
}

/**
 * 获取照片URL数组
 * @returns {string[]} 照片URL数组
 */
function getLocalPhotos() {
    // 这里返回images文件夹中所有照片的路径
    // 假设你的照片是jpg或png格式
    const photos = [];
    for (let i = 1; i <= 526; i++) {
        // 根据你的实际文件名规则修改
        // 例如: 1.jpg, 2.jpg, ...
        photos.push(`images/${i}.jpg`);
    }
    return photos;
}

// 创建球形分布的照片
const radius = 8;
const photosCount = 526;
const photos = [];

// 获取本地照片URL数组
const photoUrls = getLocalPhotos();

// 使用改进的球面分布算法
const phi = Math.PI * (3 - Math.sqrt(5)); // 黄金角度

for (let i = 0; i < photosCount; i++) {
    const y = 1 - (i / (photosCount - 1)) * 2;
    const radius_at_y = Math.sqrt(1 - y * y);
    
    const theta = phi * i;

    const x = Math.cos(theta) * radius_at_y;
    const z = Math.sin(theta) * radius_at_y;

    const scaledX = x * radius;
    const scaledY = y * radius;
    const scaledZ = z * radius;
    
    // 使用本地照片URL
    const photoUrl = photoUrls[i % photoUrls.length]; // 使用取模运算确保不会超出数组范围
    const photo = createPhotoSprite(photoUrl, scaledX, scaledY, scaledZ);
    
    photo.rotation.z = Math.random() * Math.PI * 0.05 - 0.025;
    
    scene.add(photo);
    photos.push(photo);
}

// 减慢旋转速度
let rotationSpeed = 0.0003;

// 添加环境光和点光源以增强视觉效果
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 0.5);
pointLight.position.set(20, 20, 20);
scene.add(pointLight);

// 修改放大时的效果
function zoomInPhoto(photo) {
    // 计算屏幕宽高比
    const screenAspect = window.innerWidth / window.innerHeight;
    
    // 计算合适的放大倍数，使照片不会超出屏幕
    let scale = 300; // 从450减小到300
    const photoAspect = photo.scale.x / photo.scale.y;
    
    // 针对电脑浏览器，使用更大的缩放比例
    if (window.innerWidth > 1024) { // 如果是电脑浏览器
        if (photoAspect > screenAspect) {
            // 以宽度为准，占据更大比例
            scale = (window.innerWidth * 0.85) / (photo.scale.x * renderer.domElement.clientWidth / 18); // 从25减小到18
        } else {
            // 以高度为准，占据更大比例
            scale = (window.innerHeight * 0.85) / (photo.scale.y * renderer.domElement.clientHeight / 18); // 从25减小到18
        }
    } else {
        // 移动设备使用原来的比例
        if (photoAspect > screenAspect) {
            scale = (window.innerWidth * 0.98) / (photo.scale.x * renderer.domElement.clientWidth / 8); // 从10减小到8
        } else {
            scale = (window.innerHeight * 0.98) / (photo.scale.y * renderer.domElement.clientHeight / 8); // 从10减小到8
        }
    }

    gsap.to(photo.scale, {
        x: photo.userData.originalScale.x * scale,
        y: photo.userData.originalScale.y * scale,
        z: photo.userData.originalScale.z,
        duration: 0.7,
        ease: "power2.out"
    });

    gsap.to(photo.position, {
        x: 0,
        y: 0,
        z: camera.position.z - 14,
        duration: 0.7,
        ease: "power2.out"
    });

    // 其他照片完全透明
    photos.forEach(p => {
        if (p !== photo) {
            gsap.to(p.material, {
                opacity: 0,
                duration: 0.5
            });
        }
    });
}

// 修改缩小时的效果
function zoomOutPhoto(photo) {
    gsap.to(photo.scale, {
        x: photo.userData.originalScale.x,
        y: photo.userData.originalScale.y,
        z: photo.userData.originalScale.z,
        duration: 0.7,
        ease: "power2.inOut"
    });

    gsap.to(photo.position, {
        x: photo.userData.originalPosition.x,
        y: photo.userData.originalPosition.y,
        z: photo.userData.originalPosition.z,
        duration: 0.7,
        ease: "power2.inOut",
        onComplete: () => {
            isAnimating = true;
        }
    });

    // 恢复其他照片的透明度
    photos.forEach(p => {
        gsap.to(p.material, {
            opacity: 0.95,
            duration: 0.5
        });
    });
}

// 添加动画控制变量
let isAnimating = true; // 控制球体是否旋转
let targetRotation = { x: 0, y: 0 }; // 目标旋转角度

function animate() {
    requestAnimationFrame(animate);
    
    if (isAnimating) {
        // 旋转整个场景
        scene.rotation.y += rotationSpeed;
        scene.rotation.x += rotationSpeed / 2;
    } else {
        // 平滑过渡到目标角度
        scene.rotation.y += (targetRotation.y - scene.rotation.y) * 0.1;
        scene.rotation.x += (targetRotation.x - scene.rotation.x) * 0.1;
    }
    
    // 让照片始终面向相机
    photos.forEach(photo => {
        photo.lookAt(camera.position);
    });
    
    renderer.render(scene, camera);
}

// 响应窗口大小变化
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// 开始动画
animate();

let isDragging = false;
let previousMousePosition = {
    x: 0,
    y: 0
};

document.addEventListener('mousedown', (e) => {
    isDragging = true;
});

document.addEventListener('mousemove', (e) => {
    if (isDragging && isAnimating) {  // 只在球体旋转状态下才允许拖动
        const deltaMove = {
            x: e.offsetX - previousMousePosition.x,
            y: e.offsetY - previousMousePosition.y
        };

        scene.rotation.y += deltaMove.x * 0.005;
        scene.rotation.x += deltaMove.y * 0.005;
    }

    previousMousePosition = {
        x: e.offsetX,
        y: e.offsetY
    };
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// 添加射线检测器用于点击检测
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 当前选中的照片
let selectedPhoto = null;

// 处理点击事件
document.addEventListener('click', (event) => {
    if (isDragging) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(photos);

    if (intersects.length > 0) {
        const clickedPhoto = intersects[0].object;
        if (selectedPhoto === clickedPhoto) {
            zoomOutPhoto(clickedPhoto);
            selectedPhoto = null;
        } else {
            isAnimating = false;
            if (selectedPhoto) {
                zoomOutPhoto(selectedPhoto);
            }
            zoomInPhoto(clickedPhoto);
            selectedPhoto = clickedPhoto;
        }
    } else if (selectedPhoto) {
        zoomOutPhoto(selectedPhoto);
        selectedPhoto = null;
    }
}); 