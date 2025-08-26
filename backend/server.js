const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

/**
 * Convai Web Chat 服务器
 * 提供静态文件托管和Unity WebGL支持
 */
class ConvaiWebServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.host = process.env.HOST || '0.0.0.0';
        
        // 初始化服务器
        this.initializeServer();
    }

    /**
     * 初始化服务器配置
     */
    initializeServer() {
        console.log('🔧 初始化Convai Web服务器...');

        // 基础中间件
        this.setupMiddleware();
        
        // 路由配置
        this.setupRoutes();
        
        // 错误处理
        this.setupErrorHandling();
        
        console.log('✅ 服务器配置完成');
    }

    /**
     * 设置中间件
     */
    setupMiddleware() {
        // 安全头设置
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    // 允许 blob: 用于 Unity 运行时通过 blob URL 加载脚本
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
                    imgSrc: ["'self'", "data:", "blob:"],
                    mediaSrc: ["'self'", "blob:"],
                    // 允许与同源/WS以及 blob/data 的连接
                    connectSrc: ["'self'", "blob:", "data:", "wss:", "ws:"],
                    frameSrc: ["'self'"],
                    // 允许被本地前端(3000)嵌入（注意Helmet使用frameAncestors而非'frame-ancestors'）
                    frameAncestors: ["'self'", "http://localhost:3000", "http://127.0.0.1:3000"],
                    workerSrc: ["'self'", "blob:"],
                    childSrc: ["'self'", "blob:"]
                }
            },
            // 关闭/放宽跨源隔离，允许被3000嵌入并与父页面通信
            crossOriginEmbedderPolicy: false,
            crossOriginOpenerPolicy: { policy: 'unsafe-none' },
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            // 关闭 X-Frame-Options，避免与 frame-ancestors 冲突
            frameguard: false
        }));

        // CORS配置
        this.app.use(cors({
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            credentials: true
        }));

        // 压缩响应
        this.app.use(compression());

        // 请求日志
        this.app.use((req, res, next) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
            next();
        });

        // 解析JSON和URL编码数据
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    }

    /**
     * 设置路由
     */
    setupRoutes() {
        // API路由
        this.setupAPIRoutes();
        
        // 静态文件服务
        this.setupStaticRoutes();
        
        // 主页路由
        this.setupMainRoutes();
    }

    /**
     * 设置API路由
     */
    setupAPIRoutes() {
        const apiRouter = express.Router();

        // 健康检查
        apiRouter.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: require('./package.json').version,
                uptime: process.uptime()
            });
        });

        // 系统信息
        apiRouter.get('/info', (req, res) => {
            res.json({
                name: 'Convai Web Chat Server',
                version: require('./package.json').version,
                node_version: process.version,
                platform: process.platform,
                arch: process.arch,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            });
        });

        // Unity状态检查（可扩展）
        apiRouter.get('/unity/status', (req, res) => {
            res.json({
                unity_supported: true,
                webgl_enabled: true,
                cors_enabled: true,
                timestamp: new Date().toISOString()
            });
        });

        // 聊天统计（可扩展）
        apiRouter.get('/chat/stats', (req, res) => {
            res.json({
                active_sessions: 0, // 可以实现会话跟踪
                total_messages: 0,  // 可以实现消息统计
                server_start_time: new Date().toISOString()
            });
        });

        this.app.use('/api', apiRouter);
    }

    /**
     * 设置静态文件路由
     */
    setupStaticRoutes() {
        // 工程根与 public 目录（现在 public 在 frontend 目录下）
        const projectRoot = path.join(__dirname, '..');
        const publicPath = path.join(projectRoot, 'frontend', 'public');

        // 静态文件服务配置
        const staticOptions = {
            maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
            etag: true,
            lastModified: true,
            setHeaders: (res, filePath) => {
                // Unity WebGL文件的特殊MIME类型
                if (filePath.endsWith('.unityweb')) {
                    res.setHeader('Content-Type', 'application/octet-stream');
                    res.setHeader('Content-Encoding', 'gzip');
                }
                if (filePath.endsWith('.wasm')) {
                    res.setHeader('Content-Type', 'application/wasm');
                }
                if (filePath.endsWith('.data')) {
                    res.setHeader('Content-Type', 'application/octet-stream');
                }
                if (filePath.endsWith('.js')) {
                    res.setHeader('Content-Type', 'application/javascript');
                }
                
                // 缓存控制
                if (process.env.NODE_ENV === 'production') {
                    if (filePath.includes('unity-build')) {
                        res.setHeader('Cache-Control', 'public, max-age=86400'); // Unity文件缓存1天
                    } else {
                        res.setHeader('Cache-Control', 'public, max-age=3600');  // 其他文件缓存1小时
                    }
                } else {
                    res.setHeader('Cache-Control', 'no-cache');
                }
            }
        };

        // 仅托管 Unity WebGL 构建目录（来自工程根 public/unity-build）
        this.app.use('/unity-build', express.static(
            path.join(publicPath, 'unity-build'),
            {
                ...staticOptions,
                setHeaders: (res, filePath) => {
                    // 移除 COOP/COEP，避免跨源隔离导致父子页消息无法通信
                    // 保留文件类型与缓存控制
                    staticOptions.setHeaders(res, filePath);
                }
            }
        ));
    }

    /**
     * 设置主页路由
     */
    setupMainRoutes() {
        // 主页（开发模式仅返回服务信息）
        this.app.get('/', (req, res) => {
            res.json({
                message: 'Convai Web Chat Backend running',
                unity_build: '/unity-build/',
                time: new Date().toISOString()
            });
        });

        // SPA路由支持 - 所有未匹配的GET请求都返回index.html
        this.app.get('*', (req, res) => {
            // 跳过API路由和静态资源
            if (req.url.startsWith('/api') || 
                req.url.startsWith('/unity-build') ||
                req.url.includes('.')) {
                return res.status(404).json({ error: 'Resource not found' });
            }

            res.json({ error: 'Resource not found' });
        });
    }

    /**
     * 设置错误处理
     */
    setupErrorHandling() {
        // 404处理
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.method} ${req.url} not found`,
                timestamp: new Date().toISOString()
            });
        });

        // 全局错误处理
        this.app.use((err, req, res, next) => {
            console.error('❌ 服务器错误:', err);

            // 开发环境返回详细错误信息
            const isDevelopment = process.env.NODE_ENV !== 'production';
            
            res.status(err.status || 500).json({
                error: 'Internal Server Error',
                message: isDevelopment ? err.message : 'Something went wrong',
                ...(isDevelopment && { stack: err.stack }),
                timestamp: new Date().toISOString()
            });
        });

        // 未捕获异常处理
        process.on('uncaughtException', (err) => {
            console.error('💥 未捕获异常:', err);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('💥 未处理的Promise拒绝:', reason);
            process.exit(1);
        });
    }

    /**
     * 启动服务器
     */
    start() {
        const server = this.app.listen(this.port, this.host, () => {
            console.log('🚀 Convai Web Chat服务器启动成功!');
            console.log(`📍 服务器地址: http://${this.host}:${this.port}`);
            console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📁 前端文件: ${path.join(__dirname, '..', 'frontend')}`);
            console.log('---');
            console.log('📊 可用的API端点:');
            console.log(`  GET  /api/health      - 健康检查`);
            console.log(`  GET  /api/info        - 系统信息`);
            console.log(`  GET  /api/unity/status - Unity状态`);
            console.log(`  GET  /api/chat/stats  - 聊天统计`);
            console.log('---');
        });

        // 优雅关闭
        process.on('SIGTERM', () => {
            console.log('📴 收到SIGTERM信号，正在关闭服务器...');
            server.close(() => {
                console.log('✅ 服务器已关闭');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('📴 收到SIGINT信号，正在关闭服务器...');
            server.close(() => {
                console.log('✅ 服务器已关闭');
                process.exit(0);
            });
        });

        return server;
    }
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
    const server = new ConvaiWebServer();
    server.start();
}

module.exports = ConvaiWebServer;

