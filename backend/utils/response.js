/**
 * 统一响应封装
 */

export const successResponse = (res, data = null, message = 'Success') => {
    const response = {
        success: true,
        message
    };

    if (data !== null) {
        if (typeof data === 'object' && !Array.isArray(data)) {
            // 兼容性双写：既保持顶级属性展开，又保留 data 键
            Object.assign(response, data);
            response.data = data;
        } else {
            response.data = data;
        }
    }

    return res.status(200).json(response);
};

export const errorResponse = (res, message = 'Internal Server Error', code = 500) => {
    return res.status(code).json({
        success: false,
        error: message
    });
};
